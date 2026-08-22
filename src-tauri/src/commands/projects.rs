use crate::db;
use crate::ids::now;
use crate::models::{Project, ProjectStats};
use crate::AppState;
use tauri::State;

#[tauri::command]
pub async fn list_projects(state: State<'_, AppState>) -> Result<Vec<Project>, String> {
    let conn = state.connect()?;
    let mut projects = db::collect(
        &conn,
        "SELECT id, name, description, created_at, updated_at FROM projects ORDER BY updated_at DESC",
        (),
        db::row_project,
    )
    .await?;
    for p in &mut projects {
        p.stats = Some(db::stats(&conn, &p.id).await?);
    }
    Ok(projects)
}

#[tauri::command]
pub async fn get_project(id: String, state: State<'_, AppState>) -> Result<Option<Project>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1",
        (id.as_str(),),
        db::row_project,
    )
    .await?;
    if let Some(mut p) = rows.pop() {
        p.stats = Some(db::stats(&conn, &p.id).await?);
        Ok(Some(p))
    } else {
        Ok(None)
    }
}

#[tauri::command]
pub async fn create_project(
    name: String,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<Project, String> {
    let conn = state.connect()?;
    let stamp = now();
    let id = db::new_id("proj");
    conn.execute(
        "INSERT INTO projects (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
        (id.as_str(), name.as_str(), description.as_deref(), stamp.as_str(), stamp.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(Project {
        id,
        name,
        description,
        created_at: stamp.clone(),
        updated_at: stamp,
        stats: Some(ProjectStats {
            source_count: 0,
            video_count: 0,
            short_count: 0,
            transcript_count: 0,
            draft_count: 0,
            audio_count: 0,
        }),
    })
}

#[tauri::command]
pub async fn update_project(
    id: String,
    name: Option<String>,
    description: Option<String>,
    state: State<'_, AppState>,
) -> Result<Project, String> {
    let conn = state.connect()?;
    let mut existing = get_project(id.clone(), state.clone()).await?.ok_or("We could not find that project.")?;
    if let Some(n) = name {
        existing.name = n;
    }
    if description.is_some() {
        existing.description = description;
    }
    existing.updated_at = now();
    conn.execute(
        "UPDATE projects SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
        (
            existing.name.as_str(),
            existing.description.as_deref(),
            existing.updated_at.as_str(),
            id.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    existing.stats = Some(db::stats(&conn, &existing.id).await?);
    Ok(existing)
}

#[tauri::command]
pub async fn delete_project(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    for sql in [
        "DELETE FROM social_posts WHERE output_id IN (SELECT id FROM writing_outputs WHERE project_id = ?1)",
        "DELETE FROM writing_outputs WHERE project_id = ?1",
        "DELETE FROM audio_generations WHERE project_id = ?1",
        "DELETE FROM shorts WHERE project_id = ?1",
        "DELETE FROM clip_candidates WHERE project_id = ?1",
        "DELETE FROM transcripts WHERE project_id = ?1",
        "DELETE FROM videos WHERE project_id = ?1",
        "DELETE FROM sources WHERE project_id = ?1",
        "DELETE FROM jobs WHERE project_id = ?1",
        "DELETE FROM projects WHERE id = ?1",
    ] {
        conn.execute(sql, (id.as_str(),))
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn get_project_stats(id: String, state: State<'_, AppState>) -> Result<ProjectStats, String> {
    let conn = state.connect()?;
    db::stats(&conn, &id).await
}
