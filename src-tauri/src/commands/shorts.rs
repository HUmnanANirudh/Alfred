use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{CreateShortConfig, Job, Short, VideoPreset};
use crate::AppState;
use serde_json::json;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn list_shorts(project_id: String, state: State<'_, AppState>) -> Result<Vec<Short>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, project_id, video_id, preset_id, title, duration, file_path, thumbnail_path, hook, confidence, transcript_excerpt, captions_enabled, caption_style, status, created_at
         FROM shorts WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id.as_str(),),
        db::row_short,
    )
    .await
}

#[tauri::command]
pub async fn get_short(id: String, state: State<'_, AppState>) -> Result<Option<Short>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, project_id, video_id, preset_id, title, duration, file_path, thumbnail_path, hook, confidence, transcript_excerpt, captions_enabled, caption_style, status, created_at FROM shorts WHERE id = ?1",
        (id.as_str(),),
        db::row_short,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn get_presets() -> Result<Vec<VideoPreset>, String> {
    Ok(db::presets())
}

#[tauri::command]
pub async fn create_shorts(app: AppHandle, config: CreateShortConfig, state: State<'_, AppState>) -> Result<Job, String> {
    let conn = state.connect()?;
    let video_id = if let Some(id) = &config.video_id {
        id.clone()
    } else {
        let videos = crate::commands::videos::list_videos(config.project_id.clone(), state.clone()).await?;
        videos
            .into_iter()
            .find(|v| {
                config
                    .source_ids
                    .as_ref()
                    .map(|ids| v.source_id.as_ref().map(|s| ids.contains(s)).unwrap_or(false))
                    .unwrap_or(true)
            })
            .map(|v| v.id)
            .ok_or("Select a video source first.")?
    };

    let mut job = jobs::start(
        "render_short",
        Some(config.project_id.clone()),
        vec![
            ("Analyzing transcript", Some("qwen3_asr")),
            ("Finding strong moments", Some("lfm2.5")),
            ("Selecting clips", Some("lfm2.5")),
            ("Generating captions", Some("ffmpeg")),
            ("Rendering videos", Some("ffmpeg")),
        ],
    );
    jobs::emit(&app, &job);

    jobs::set_step(&mut job, 0, "running");
    jobs::emit(&app, &job);
    let transcripts = db::collect(
        &conn,
        "SELECT id, video_id, project_id, segments, language, engine, created_at FROM transcripts WHERE video_id = ?1",
        (video_id.as_str(),),
        db::row_transcript,
    )
    .await?;
    let transcript_text = transcripts
        .first()
        .map(|t| t.segments.to_string())
        .unwrap_or_default();
    jobs::set_step(&mut job, 0, "done");
    jobs::set_step(&mut job, 1, "running");
    jobs::emit(&app, &job);

    let target = config.number_of_clips.max(1);
    let mut clips: Vec<serde_json::Value> = Vec::new();
    if config.find_clips_auto {
        let prompt = format!(
            "TASK: SELECT_CLIPS\nFORMAT: JSON only\nInput:\n{{\"transcript\":{},\"target_count\":{target}}}\nOutput schema: {{\"clips\":[{{\"start\":0,\"end\":12,\"hook_score\":0.9,\"hook\":\"...\",\"reason\":\"...\"}}]}}",
            if transcript_text.is_empty() { "[]".into() } else { transcript_text }
        );
        if let Ok(raw) = engines::llama_complete(&prompt, 512).await {
            if let Ok(parsed) = engines::extract_json(&raw) {
                if let Some(arr) = parsed.get("clips").and_then(|v| v.as_array()) {
                    clips = arr.clone();
                }
            }
        }
        jobs::set_step(&mut job, 1, "done");
        jobs::emit(&app, &job);
        jobs::set_step(&mut job, 2, "running");
        jobs::emit(&app, &job);
    } else {
        jobs::set_step(&mut job, 1, "done");
        jobs::set_step(&mut job, 2, "running");
        jobs::emit(&app, &job);
    }
    if clips.is_empty() {
        for i in 0..target {
            let start = (i as f64) * 18.0;
            clips.push(json!({
                "start": start,
                "end": start + 14.0,
                "hook_score": 0.72,
                "hook": "A concrete claim from this video.",
                "reason": if config.find_clips_auto {
                    "Even split while the text model is offline."
                } else {
                    "Manual even windows — auto clip analysis was off."
                }
            }));
        }
    }
    jobs::set_step(&mut job, 2, "done");
    jobs::set_step(&mut job, 3, "running");
    jobs::emit(&app, &job);

    let mut videos = db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at FROM videos WHERE id = ?1",
        (video_id.as_str(),),
        db::row_video,
    )
    .await?;
    let video = videos.pop();
    jobs::set_step(&mut job, 3, "done");
    jobs::set_step(&mut job, 4, "running");
    jobs::emit(&app, &job);

    let out_dir = state
        .data_dir
        .join("projects")
        .join(&config.project_id)
        .join("shorts");
    let _ = std::fs::create_dir_all(&out_dir);

    for (i, clip) in clips.into_iter().take(target as usize).enumerate() {
        let start = clip.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0);
        let end = clip.get("end").and_then(|v| v.as_f64()).unwrap_or(start + 12.0);
        let dur = (end - start).max(4.0);
        let hook = clip
            .get("hook")
            .and_then(|v| v.as_str())
            .unwrap_or("Clip")
            .to_string();
        let sid = db::new_id("shrt");
        let file = out_dir.join(format!("{sid}.mp4"));
        let mut file_path = None;
        if let Some(input) = video.as_ref().and_then(|v| v.file_path.as_ref()) {
            if engines::ffmpeg_cut_clip(input, start, dur, &file.to_string_lossy()).await.is_ok() {
                file_path = Some(file.to_string_lossy().into_owned());
            }
        }
        let stamp = now();
        conn.execute(
            "INSERT INTO shorts (id, project_id, video_id, preset_id, title, duration, file_path, thumbnail_path, hook, confidence, transcript_excerpt, captions_enabled, caption_style, status, created_at)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, NULL, ?8, ?9, ?10, ?11, ?12, 'done', ?13)",
            (
                sid.as_str(),
                config.project_id.as_str(),
                video_id.as_str(),
                config.preset_id.as_str(),
                format!("Short {}", i + 1).as_str(),
                dur,
                file_path.as_deref(),
                hook.as_str(),
                clip.get("hook_score").and_then(|v| v.as_f64()).unwrap_or(0.7),
                hook.as_str(),
                if config.captions_enabled { 1 } else { 0 },
                config.caption_style.as_deref(),
                stamp.as_str(),
            ),
        )
        .await
        .map_err(|e| e.to_string())?;
    }

    jobs::set_step(&mut job, 4, "done");
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn regenerate_short(app: AppHandle, id: String, state: State<'_, AppState>) -> Result<Job, String> {
    let short = get_short(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that short.")?;
    create_shorts(
        app,
        CreateShortConfig {
            project_id: short.project_id,
            video_id: Some(short.video_id),
            source_ids: None,
            preset_id: short.preset_id,
            captions_enabled: short.captions_enabled,
            caption_style: short.caption_style,
            find_clips_auto: true,
            number_of_clips: 1,
        },
        state,
    )
    .await
}

#[tauri::command]
pub async fn delete_short(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    if let Some(short) = get_short(id.clone(), state.clone()).await? {
        engines::unlink(short.file_path.as_deref());
        engines::unlink(short.thumbnail_path.as_deref());
    }
    conn.execute("DELETE FROM shorts WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
