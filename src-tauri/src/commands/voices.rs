use crate::db;
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
    for i in 0..3 {
        jobs::set_step(&mut job, i, "running");
        jobs::emit(&app, &job);
        jobs::set_step(&mut job, i, "done");
        jobs::emit(&app, &job);
    }
    let conn = state.connect()?;
    let stamp = now();
    let id = db::new_id("vce");
    conn.execute(
        "INSERT INTO voices (id, name, sample_path, engine, is_default, is_cloned, created_at) VALUES (?1, ?2, ?3, 'chatterbox', 0, 1, ?4)",
        (id.as_str(), name.as_str(), sample_path.as_deref(), stamp.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    jobs::finish(&mut job, true, None);
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn delete_voice(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    conn.execute("DELETE FROM voices WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn preview_voice(_id: String) -> Result<String, String> {
    Ok(String::new())
}
