use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{Job, Transcript};
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
    let segments = if asr.segments.is_empty() {
        fallback_segments(&text)
    } else {
        asr.segments
    };
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

fn fallback_segments(text: &str) -> Vec<serde_json::Value> {
    let mut t = 0.0f64;
    text.split(|c| c == '.' || c == '\n')
        .filter(|s| !s.trim().is_empty())
        .enumerate()
        .map(|(i, sentence)| {
            let start = t;
            let end = t + 6.0 + (sentence.len() as f64 / 24.0);
            t = end + 0.2;
            json!({
                "id": db::new_id("seg"),
                "start": start,
                "end": end,
                "text": sentence.trim(),
                "speaker": "Speaker 1",
                "confidence": 0.9,
                "index": i
            })
        })
        .collect()
}
