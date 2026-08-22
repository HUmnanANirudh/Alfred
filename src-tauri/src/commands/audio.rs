use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{AudioGeneration, GenerateAudioConfig, Job};
use crate::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn list_audio(project_id: String, state: State<'_, AppState>) -> Result<Vec<AudioGeneration>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, project_id, voice_id, voice_name, title, script, duration, file_path, engine, status, source_ids, created_at, updated_at
         FROM audio_generations WHERE project_id = ?1 ORDER BY COALESCE(updated_at, created_at) DESC",
        (project_id.as_str(),),
        db::row_audio,
    )
    .await
}

#[tauri::command]
pub async fn get_audio(id: String, state: State<'_, AppState>) -> Result<Option<AudioGeneration>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, project_id, voice_id, voice_name, title, script, duration, file_path, engine, status, source_ids, created_at, updated_at FROM audio_generations WHERE id = ?1",
        (id.as_str(),),
        db::row_audio,
    )
    .await?;
    Ok(rows.pop())
}

fn title_from_script(script: &str) -> String {
    script
        .lines()
        .find(|l| !l.trim().is_empty())
        .map(|l| {
            let t = l.trim();
            if t.chars().count() > 48 {
                format!("{}…", t.chars().take(48).collect::<String>())
            } else {
                t.to_string()
            }
        })
        .unwrap_or_else(|| "Untitled draft".into())
}

#[tauri::command]
pub async fn generate_audio(
    app: AppHandle,
    config: GenerateAudioConfig,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    let conn = state.connect()?;
    let mut voices = db::collect(
        &conn,
        "SELECT id, name, sample_path, engine, is_default, is_cloned, created_at FROM voices WHERE id = ?1",
        (config.voice_id.as_str(),),
        db::row_voice,
    )
    .await?;
    let voice = voices.pop();
    let mut job = jobs::start(
        "generate_audio",
        Some(config.project_id.clone()),
        vec![
            ("Preparing script", Some("lfm2.5")),
            ("Processing voice", voice.as_ref().map(|v| v.engine.as_str())),
            ("Generating speech", Some("pocket_tts")),
            ("Finalizing audio", Some("audio_cpp")),
        ],
    );
    jobs::emit(&app, &job);
    for i in 0..4 {
        jobs::set_step(&mut job, i, "running");
        jobs::emit(&app, &job);
        if i == 2 {
            let dir = state
                .data_dir
                .join("projects")
                .join(&config.project_id)
                .join("audio");
            let _ = std::fs::create_dir_all(&dir);
            let id = db::new_id("aud");
            let out = dir.join(format!("{id}.wav"));
            let file_path = match engines::audio_tts(&config.script, &out.to_string_lossy()).await {
                Ok(()) => Some(out.to_string_lossy().into_owned()),
                Err(e) => {
                    jobs::finish(&mut job, false, Some(e));
                    jobs::emit(&app, &job);
                    return Ok(job);
                }
            };
            let stamp = now();
            let title = config
                .title
                .clone()
                .filter(|t| !t.trim().is_empty())
                .unwrap_or_else(|| title_from_script(&config.script));
            let words = config.script.split_whitespace().count() as f64;
            let ids = serde_json::to_string(&config.source_ids).unwrap_or_else(|_| "[]".into());
            let duration = engines::ffprobe_duration(file_path.as_deref().unwrap_or(""))
                .await
                .unwrap_or_else(|| (words / 2.4).max(8.0));
            conn.execute(
                "INSERT INTO audio_generations (id, project_id, voice_id, voice_name, title, script, duration, file_path, engine, status, source_ids, created_at, updated_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 'done', ?10, ?11, ?12)",
                (
                    id.as_str(),
                    config.project_id.as_str(),
                    config.voice_id.as_str(),
                    voice.as_ref().map(|v| v.name.as_str()).unwrap_or("Voice"),
                    title.as_str(),
                    config.script.as_str(),
                    duration,
                    file_path.as_deref(),
                    voice.as_ref().map(|v| v.engine.as_str()),
                    ids.as_str(),
                    stamp.as_str(),
                    stamp.as_str(),
                ),
            )
            .await
            .map_err(|e| e.to_string())?;
        }
        jobs::set_step(&mut job, i, "done");
        jobs::emit(&app, &job);
    }
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn update_audio(
    id: String,
    title: Option<String>,
    script: Option<String>,
    voice_id: Option<String>,
    voice_name: Option<String>,
    state: State<'_, AppState>,
) -> Result<AudioGeneration, String> {
    let mut item = get_audio(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that audio.")?;
    if let Some(t) = title {
        item.title = Some(t);
    }
    if let Some(s) = script {
        let words = s.split_whitespace().count() as f64;
        item.duration = Some((words / 2.4).max(8.0));
        item.script = s;
    }
    if let Some(v) = voice_id {
        item.voice_id = v;
    }
    if let Some(n) = voice_name {
        item.voice_name = n;
    }
    item.updated_at = Some(now());
    let conn = state.connect()?;
    conn.execute(
        "UPDATE audio_generations SET title = ?1, script = ?2, voice_id = ?3, voice_name = ?4, duration = ?5, updated_at = ?6 WHERE id = ?7",
        (
            item.title.as_deref(),
            item.script.as_str(),
            item.voice_id.as_str(),
            item.voice_name.as_str(),
            item.duration,
            item.updated_at.as_deref(),
            id.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub async fn render_audio(
    app: AppHandle,
    id: String,
    voice_id: String,
    state: State<'_, AppState>,
) -> Result<Job, String> {
    let item = get_audio(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that audio.")?;
    generate_audio(
        app,
        GenerateAudioConfig {
            project_id: item.project_id,
            voice_id,
            script: item.script,
            title: item.title,
            source_ids: item.source_ids,
        },
        state,
    )
    .await
}

#[tauri::command]
pub async fn delete_audio(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    if let Some(item) = get_audio(id.clone(), state.clone()).await? {
        engines::unlink(item.file_path.as_deref());
    }
    conn.execute("DELETE FROM audio_generations WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
