use crate::db;
use crate::ids::now;
use crate::models::{Source, Video};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_videos(project_id: String, state: State<'_, AppState>) -> Result<Vec<Video>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at
         FROM videos WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id.as_str(),),
        db::row_video,
    )
    .await
}

#[tauri::command]
pub async fn get_video(id: String, state: State<'_, AppState>) -> Result<Option<Video>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at FROM videos WHERE id = ?1",
        (id.as_str(),),
        db::row_video,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn add_video_from_source(
    project_id: String,
    source_id: String,
    state: State<'_, AppState>,
) -> Result<Video, String> {
    let conn = state.connect()?;
    let existing = db::collect(
        &conn,
        "SELECT id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at FROM videos WHERE source_id = ?1",
        (source_id.as_str(),),
        db::row_video,
    )
    .await?;
    if let Some(v) = existing.into_iter().next() {
        return Ok(v);
    }
    let mut sources = db::collect(
        &conn,
        "SELECT id, project_id, type, title, content, url, word_count, excerpt, metadata, created_at FROM sources WHERE id = ?1",
        (source_id.as_str(),),
        db::row_source,
    )
    .await?;
    let source = sources.pop().ok_or("We could not find that source.")?;
    let stamp = now();
    let id = db::new_id("vid");
    conn.execute(
        "INSERT INTO videos (id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at)
         VALUES (?1, ?2, ?3, ?4, NULL, NULL, NULL, ?5, 0, ?6)",
        (
            id.as_str(),
            project_id.as_str(),
            source_id.as_str(),
            source.title.as_str(),
            source.url.as_deref(),
            stamp.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(Video {
        id,
        project_id,
        source_id: Some(source_id),
        title: source.title,
        duration: None,
        file_path: None,
        thumbnail_path: None,
        url: source.url,
        has_transcript: false,
        created_at: stamp,
    })
}

#[tauri::command]
pub async fn add_video_from_url(
    project_id: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<Video, String> {
    crate::commands::sources::add_youtube(project_id.clone(), url, state.clone()).await?;
    list_videos(project_id, state)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| "Video was not created.".into())
}

#[tauri::command]
pub async fn add_video_from_local(
    project_id: String,
    file_path: String,
    state: State<'_, AppState>,
) -> Result<Video, String> {
    let name = std::path::Path::new(&file_path)
        .file_name()
        .and_then(|s| s.to_str())
        .unwrap_or("Local video")
        .to_string();
    crate::commands::sources::add_source(
        Source {
            id: String::new(),
            project_id: project_id.clone(),
            source_type: "video".into(),
            title: name,
            content: Some(String::new()),
            url: None,
            word_count: Some(0),
            excerpt: None,
            metadata: Some(serde_json::json!({ "type": "video", "filePath": file_path })),
            created_at: String::new(),
        },
        state.clone(),
    )
    .await?;
    list_videos(project_id, state)
        .await?
        .into_iter()
        .next()
        .ok_or_else(|| "Video was not created.".into())
}

#[tauri::command]
pub async fn delete_video(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    conn.execute("DELETE FROM shorts WHERE video_id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM transcripts WHERE video_id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM videos WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
