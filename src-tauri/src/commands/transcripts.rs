use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{Job, Transcript, TranscriptSegment};
use crate::AppState;
use serde_json::json;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn get_transcript(video_id: String, state: State<'_, AppState>) -> Result<Option<Transcript>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, video_id, project_id, segments, language, engine, created_at FROM transcripts WHERE video_id = ?1",
        (video_id.as_str(),),
        db::row_transcript,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn list_transcripts(project_id: String, state: State<'_, AppState>) -> Result<Vec<Transcript>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, video_id, project_id, segments, language, engine, created_at FROM transcripts WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id.as_str(),),
        db::row_transcript,
    )
    .await
}

#[tauri::command]
pub async fn generate_transcript(
    app: AppHandle,
    video_id: String,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    let conn = state.connect()?;
    let mut videos = db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at FROM videos WHERE id = ?1",
        (video_id.as_str(),),
        db::row_video,
    )
    .await?;
    let video = videos.pop().ok_or("We could not find that video.")?;
    let mut job = jobs::start(
        "generate_transcript",
        Some(video.project_id.clone()),
        vec![
            ("Reading audio", Some("audio_cpp")),
            ("Transcribing speech", Some("qwen3_asr")),
            ("Aligning words", Some("qwen3_forced_aligner")),
        ],
    );
    jobs::emit(&app, &job);

    jobs::set_step(&mut job, 0, "running");
    jobs::emit(&app, &job);

    let wav = state
        .data_dir
        .join("projects")
        .join(&video.project_id)
        .join("audio")
        .join(format!("{}.wav", video.id));
    let _ = std::fs::create_dir_all(wav.parent().unwrap());
    let media = video.file_path.clone();
    if let Some(path) = &media {
        let _ = engines::ffmpeg_extract_wav(path, &wav.to_string_lossy()).await;
    }
    jobs::set_step(&mut job, 0, "done");
    jobs::set_step(&mut job, 1, "running");
    jobs::emit(&app, &job);

    let asr = if wav.exists() {
        match engines::audio_transcribe(&wav.to_string_lossy()).await {
            Ok(t) => t,
            Err(e) => {
                jobs::finish(&mut job, false, Some(e));
                jobs::emit(&app, &job);
                return Ok(job);
            }
        }
    } else {
        jobs::finish(
            &mut job,
            false,
            Some("No local video file to transcribe. Add a file or download with yt-dlp first.".into()),
        );
        jobs::emit(&app, &job);
        return Ok(job);
    };

    jobs::set_step(&mut job, 1, "done");
    jobs::set_step(&mut job, 2, "running");
    jobs::emit(&app, &job);

    let text = asr.text.clone();
    let mut segments = asr.segments;
    if segments.is_empty() {
        if text.trim().is_empty() {
            jobs::finish(
                &mut job,
                false,
                Some("ASR returned no speech for this file.".into()),
            );
            jobs::emit(&app, &job);
            return Ok(job);
        }
        let end = engines::ffprobe_duration(&wav.to_string_lossy())
            .await
            .unwrap_or(0.0);
        segments = vec![json!({
            "id": db::new_id("seg"),
            "start": 0.0,
            "end": end,
            "text": text.trim(),
            "index": 0
        })];
    }
    let stamp = now();
    let tid = db::new_id("trs");
    let segs_json = serde_json::to_string(&segments).unwrap_or_else(|_| "[]".into());
    conn.execute("DELETE FROM transcripts WHERE video_id = ?1", (video_id.as_str(),))
        .await
        .ok();
    conn.execute(
        "INSERT INTO transcripts (id, video_id, project_id, segments, language, engine, created_at) VALUES (?1, ?2, ?3, ?4, 'en', 'qwen3_asr', ?5)",
        (tid.as_str(), video_id.as_str(), video.project_id.as_str(), segs_json.as_str(), stamp.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE videos SET has_transcript = 1 WHERE id = ?1",
        (video_id.as_str(),),
    )
    .await
    .ok();
    conn.execute(
        "UPDATE sources SET content = ?1, word_count = ?2, excerpt = ?3 WHERE type = 'transcript' AND metadata LIKE ?4",
        (
            text.as_str(),
            db::word_count(&text),
            db::excerpt(&text).as_str(),
            format!("%{}%", video.id).as_str(),
        ),
    )
    .await
    .ok();

    jobs::set_step(&mut job, 2, "done");
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn update_transcript_segment(
    transcript_id: String,
    segment: TranscriptSegment,
    state: State<'_, AppState>,
) -> Result<Transcript, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, video_id, project_id, segments, language, engine, created_at FROM transcripts WHERE id = ?1",
        (transcript_id.as_str(),),
        db::row_transcript,
    )
    .await?;
    let mut tr = rows.pop().ok_or("We could not find that transcript.")?;
    let mut segs: Vec<serde_json::Value> = serde_json::from_value(tr.segments.clone()).unwrap_or_default();
    let mut found = false;
    for item in segs.iter_mut() {
        if item.get("id").and_then(|v| v.as_str()) == Some(segment.id.as_str()) {
            *item = serde_json::to_value(&segment).unwrap_or(item.clone());
            found = true;
            break;
        }
    }
    if !found {
        segs.push(serde_json::to_value(&segment).unwrap_or(json!({})));
    }
    let segs_json = serde_json::to_string(&segs).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "UPDATE transcripts SET segments = ?1 WHERE id = ?2",
        (segs_json.as_str(), transcript_id.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    tr.segments = serde_json::Value::Array(segs);
    Ok(tr)
}

#[tauri::command]
pub async fn diarize_transcript(
    app: AppHandle,
    video_id: String,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, video_id, project_id, segments, language, engine, created_at FROM transcripts WHERE video_id = ?1",
        (video_id.as_str(),),
        db::row_transcript,
    )
    .await?;
    let mut tr = rows.pop().ok_or("Transcribe this video first, then diarize.")?;
    let mut videos = db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at FROM videos WHERE id = ?1",
        (video_id.as_str(),),
        db::row_video,
    )
    .await?;
    let video = videos.pop().ok_or("We could not find that video.")?;
    let mut job = jobs::start(
        "diarize_transcript",
        Some(tr.project_id.clone()),
        vec![("Diarizing speakers", Some("sortformer_diar"))],
    );
    jobs::emit(&app, &job);
    jobs::set_step(&mut job, 0, "running");
    jobs::emit(&app, &job);

    let wav = state
        .data_dir
        .join("projects")
        .join(&tr.project_id)
        .join("audio")
        .join(format!("{}.wav", video.id));
    if !wav.exists() {
        if let Some(path) = &video.file_path {
            let _ = std::fs::create_dir_all(wav.parent().unwrap());
            engines::ffmpeg_extract_wav(path, &wav.to_string_lossy()).await?;
        }
    }
    if !wav.exists() {
        jobs::finish(&mut job, false, Some("No audio file to diarize.".into()));
        jobs::emit(&app, &job);
        return Ok(job);
    }

    let diar = match engines::audio_task("diar", &wav.to_string_lossy()).await {
        Ok(v) => v,
        Err(e) => {
            jobs::finish(&mut job, false, Some(e));
            jobs::emit(&app, &job);
            return Ok(job);
        }
    };
    let turns = diar
        .get("segments")
        .or_else(|| diar.get("speakers"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    if turns.is_empty() {
        jobs::finish(
            &mut job,
            false,
            Some("Sortformer returned no speakers for this file.".into()),
        );
        jobs::emit(&app, &job);
        return Ok(job);
    }
    let mut segs: Vec<serde_json::Value> = serde_json::from_value(tr.segments.clone()).unwrap_or_default();
    for seg in segs.iter_mut() {
        let start = seg.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let mid = start + (seg.get("end").and_then(|v| v.as_f64()).unwrap_or(start) - start) / 2.0;
        if let Some(turn) = turns.iter().find(|t| {
            let s = t.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
            let e = t.get("end").and_then(|v| v.as_f64()).unwrap_or(s);
            mid >= s && mid <= e
        }) {
            if let Some(spk) = turn
                .get("speaker")
                .or_else(|| turn.get("label"))
                .and_then(|v| v.as_str())
            {
                seg["speaker"] = json!(spk);
            }
        }
    }
    let segs_json = serde_json::to_string(&segs).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "UPDATE transcripts SET segments = ?1, engine = 'qwen3_asr+sortformer' WHERE id = ?2",
        (segs_json.as_str(), tr.id.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    tr.segments = serde_json::Value::Array(segs);
    jobs::set_step(&mut job, 0, "done");
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}
