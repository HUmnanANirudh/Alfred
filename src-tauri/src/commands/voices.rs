use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{Job, Voice};
use crate::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn list_voices(state: State<'_, AppState>) -> Result<Vec<Voice>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, name, sample_path, engine, is_default, is_cloned, created_at FROM voices ORDER BY created_at ASC",
        (),
        db::row_voice,
    )
    .await
}

#[tauri::command]
pub async fn get_voice(id: String, state: State<'_, AppState>) -> Result<Option<Voice>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, name, sample_path, engine, is_default, is_cloned, created_at FROM voices WHERE id = ?1",
        (id.as_str(),),
        db::row_voice,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn create_voice(
    app: AppHandle,
    name: String,
    sample_path: Option<String>,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    let sample = sample_path.filter(|p| !p.is_empty()).ok_or(
        "Pick a voice sample of about 30 seconds, then clone.",
    )?;
    if !std::path::Path::new(&sample).exists() {
        return Err("That sample file is not on this machine.".into());
    }
    let mut job = jobs::start(
        "clone_voice",
        None,
        vec![
            ("Reading sample", Some("audio_cpp")),
            ("Building voice", Some("chatterbox")),
            ("Saving on device", None),
        ],
    );
    jobs::emit(&app, &job);
    jobs::set_step(&mut job, 0, "running");
    jobs::emit(&app, &job);

    let dest_dir = state.data_dir.join("voices");
    let _ = std::fs::create_dir_all(&dest_dir);
    let id = db::new_id("vce");
    let stored = dest_dir.join(format!("{id}.wav"));
    if engines::ffmpeg_extract_wav(&sample, &stored.to_string_lossy())
        .await
        .is_err()
    {
        std::fs::copy(&sample, &stored).map_err(|e| e.to_string())?;
    }
    jobs::set_step(&mut job, 0, "done");
    jobs::set_step(&mut job, 1, "running");
    jobs::emit(&app, &job);

    match engines::audio_task("clon", &stored.to_string_lossy()).await {
        Ok(_) => {}
        Err(e) => {
            jobs::finish(&mut job, false, Some(e));
            jobs::emit(&app, &job);
            return Ok(job);
        }
    }

    jobs::set_step(&mut job, 1, "done");
    jobs::set_step(&mut job, 2, "running");
    jobs::emit(&app, &job);
    let conn = state.connect()?;
    let stamp = now();
    let sample_stored = stored.to_string_lossy().into_owned();
    conn.execute(
        "INSERT INTO voices (id, name, sample_path, engine, is_default, is_cloned, created_at) VALUES (?1, ?2, ?3, 'chatterbox', 0, 1, ?4)",
        (
            id.as_str(),
            name.as_str(),
            sample_stored.as_str(),
            stamp.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    jobs::set_step(&mut job, 2, "done");
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn delete_voice(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    if let Some(voice) = get_voice(id.clone(), state.clone()).await? {
        engines::unlink(voice.sample_path.as_deref());
    }
    conn.execute("DELETE FROM voices WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn preview_voice(id: String, state: State<'_, AppState>) -> Result<String, String> {
    preview_tts(
        id,
        "Your research should never leave this machine.".into(),
        state,
    )
    .await
}

#[tauri::command]
pub async fn preview_tts(voice_id: String, script: String, state: State<'_, AppState>) -> Result<String, String> {
    let voice = get_voice(voice_id.clone(), state.clone())
        .await?
        .ok_or("We could not find that voice.")?;
    let line = script.trim();
    if line.is_empty() {
        return Err("There is no script to preview.".into());
    }
    let snippet: String = line.chars().take(400).collect();
    let dir = state.data_dir.join("exports").join("previews");
    let _ = std::fs::create_dir_all(&dir);
    let out = dir.join(format!("{}.wav", db::new_id("prv")));
    engines::audio_tts_with(
        &snippet,
        &out.to_string_lossy(),
        Some(voice.id.as_str()),
        voice.sample_path.as_deref(),
    )
    .await?;
    Ok(out.to_string_lossy().into_owned())
}
