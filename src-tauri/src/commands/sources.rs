use crate::db;
use crate::engines;
use crate::ids::now;
use crate::models::{AddYoutubeResult, FetchArticleResult, Source, Video};
use crate::AppState;
use serde_json::json;
use tauri::State;

async fn insert_source(conn: &turso::Connection, source: &Source) -> Result<(), String> {
    let meta = source
        .metadata
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "{}".into()));
    conn.execute(
        "INSERT INTO sources (id, project_id, type, title, content, url, word_count, excerpt, metadata, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            source.id.as_str(),
            source.project_id.as_str(),
            source.source_type.as_str(),
            source.title.as_str(),
            source.content.as_deref(),
            source.url.as_deref(),
            source.word_count,
            source.excerpt.as_deref(),
            meta.as_deref(),
            source.created_at.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

async fn persist_video_bundle(
    conn: &turso::Connection,
    source: &Source,
    data_dir: &std::path::Path,
) -> Result<Video, String> {
    let vid = db::new_id("vid");
    let stamp = now();
    let duration = source
        .metadata
        .as_ref()
        .and_then(|m| m.get("duration"))
        .and_then(|v| v.as_f64());
    let mut file_path = source
        .metadata
        .as_ref()
        .and_then(|m| m.get("filePath").or_else(|| m.get("file_path")))
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    if source.source_type == "youtube" {
        if let Some(url) = &source.url {
            let dir = data_dir.join("projects").join(&source.project_id).join("videos");
            let _ = std::fs::create_dir_all(&dir);
            let out = dir.join(format!("{vid}.%(ext)s"));
            if engines::ytdlp_download(url, &out.to_string_lossy()).is_ok() {
                let mp4 = dir.join(format!("{vid}.mp4"));
                if mp4.exists() {
                    file_path = Some(mp4.to_string_lossy().into());
                } else if let Ok(mut rd) = std::fs::read_dir(&dir) {
                    if let Some(found) = rd.find_map(|e| {
                        let p = e.ok()?.path();
                        let name = p.file_name()?.to_string_lossy().into_owned();
                        if name.starts_with(&vid) {
                            Some(p.to_string_lossy().into_owned())
                        } else {
                            None
                        }
                    }) {
                        file_path = Some(found);
                    }
                }
            }
        }
    }

    conn.execute(
        "INSERT INTO videos (id, project_id, source_id, title, duration, file_path, thumbnail_path, url, has_transcript, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 0, ?9)",
        (
            vid.as_str(),
            source.project_id.as_str(),
            source.id.as_str(),
            source.title.as_str(),
            duration,
            file_path.as_deref(),
            source
                .metadata
                .as_ref()
                .and_then(|m| m.get("thumbnail"))
                .and_then(|v| v.as_str()),
            source.url.as_deref(),
            stamp.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;

    let trs = Source {
        id: db::new_id("src"),
        project_id: source.project_id.clone(),
        source_type: "transcript".into(),
        title: source.title.clone(),
        content: Some(String::new()),
        url: None,
        word_count: Some(0),
        excerpt: None,
        metadata: Some(json!({
            "type": "transcript",
            "videoSourceId": source.id,
            "videoId": vid
        })),
        created_at: stamp.clone(),
    };
    insert_source(conn, &trs).await?;

    Ok(Video {
        id: vid,
        project_id: source.project_id.clone(),
        source_id: Some(source.id.clone()),
        title: source.title.clone(),
        duration,
        file_path,
        thumbnail_path: None,
        url: source.url.clone(),
        has_transcript: false,
        created_at: stamp,
    })
}

#[tauri::command]
pub async fn list_sources(project_id: String, state: State<'_, AppState>) -> Result<Vec<Source>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, project_id, type, title, content, url, word_count, excerpt, metadata, created_at
         FROM sources WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id.as_str(),),
        db::row_source,
    )
    .await
}

#[tauri::command]
pub async fn get_source(id: String, state: State<'_, AppState>) -> Result<Option<Source>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, project_id, type, title, content, url, word_count, excerpt, metadata, created_at FROM sources WHERE id = ?1",
        (id.as_str(),),
        db::row_source,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn fetch_article(url: String) -> Result<FetchArticleResult, String> {
    match engines::fetch_url_text(&url).await {
        Ok(text) if text.split_whitespace().count() > 40 => {
            let domain = url.split("://").nth(1).and_then(|r| {
                r.split('/').next().map(|h| h.trim_start_matches("www.").to_string())
            });
            let title = domain
                .as_ref()
                .map(|d| format!("Notes from {d}"))
                .unwrap_or_else(|| "Extracted article".into());
            Ok(FetchArticleResult {
                success: true,
                data: Some(json!({
                    "title": title,
                    "content": text,
                    "wordCount": db::word_count(&text),
                    "excerpt": db::excerpt(&text),
                    "url": url,
                    "type": "article",
                    "metadata": { "type": "article", "domain": domain }
                })),
                reason: None,
            })
        }
        Ok(_) => Ok(FetchArticleResult {
            success: false,
            data: None,
            reason: Some("extraction_failed".into()),
        }),
        Err(reason) => Ok(FetchArticleResult {
            success: false,
            data: None,
            reason: Some(reason),
        }),
    }
}

#[tauri::command]
pub async fn add_youtube(
    project_id: String,
    url: String,
    state: State<'_, AppState>,
) -> Result<AddYoutubeResult, String> {
    let Some(video_id) = db::youtube_id(&url) else {
        return Ok(AddYoutubeResult {
            success: false,
            source: None,
            reason: Some("invalid_url".into()),
        });
    };
    let mut title = "YouTube video".to_string();
    let mut duration = None;
    let mut channel = None;
    let mut thumbnail = None;
    match engines::ytdlp_info(&url) {
        Ok(info) => {
            if let Some(t) = info.get("title").and_then(|v| v.as_str()) {
                title = t.to_string();
            }
            duration = info.get("duration").and_then(|v| v.as_f64());
            channel = info
                .get("uploader")
                .or_else(|| info.get("channel"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
            thumbnail = info
                .get("thumbnail")
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
        Err(e) if e == "private_video" || e == "network_error" => {
            if e == "private_video" {
                return Ok(AddYoutubeResult {
                    success: false,
                    source: None,
                    reason: Some(e),
                });
            }
        }
        Err(_) => {}
    }

    let stamp = now();
    let source = Source {
        id: db::new_id("src"),
        project_id,
        source_type: "youtube".into(),
        title,
        content: Some(String::new()),
        url: Some(url),
        word_count: Some(0),
        excerpt: None,
        metadata: Some(json!({
            "type": "youtube",
            "videoId": video_id,
            "channelName": channel,
            "duration": duration,
            "thumbnail": thumbnail
        })),
        created_at: stamp,
    };
    let conn = state.connect()?;
    insert_source(&conn, &source).await?;
    persist_video_bundle(&conn, &source, &state.data_dir).await?;
    Ok(AddYoutubeResult {
        success: true,
        source: Some(source),
        reason: None,
    })
}

#[tauri::command]
pub async fn add_text(
    project_id: String,
    title: String,
    content: String,
    state: State<'_, AppState>,
) -> Result<Source, String> {
    add_source(
        Source {
            id: String::new(),
            project_id,
            source_type: "text".into(),
            title,
            content: Some(content.clone()),
            url: None,
            word_count: Some(db::word_count(&content)),
            excerpt: Some(db::excerpt(&content)),
            metadata: Some(json!({ "type": "text" })),
            created_at: String::new(),
        },
        state,
    )
    .await
}

#[tauri::command]
pub async fn add_source(mut source: Source, state: State<'_, AppState>) -> Result<Source, String> {
    if source.id.is_empty() {
        source.id = db::new_id("src");
    }
    if source.created_at.is_empty() {
        source.created_at = now();
    }
    if let Some(content) = &source.content {
        if source.word_count.is_none() {
            source.word_count = Some(db::word_count(content));
        }
        if source.excerpt.is_none() {
            source.excerpt = Some(db::excerpt(content));
        }
    }
    let conn = state.connect()?;
    insert_source(&conn, &source).await?;
    if source.source_type == "youtube" || source.source_type == "video" {
        persist_video_bundle(&conn, &source, &state.data_dir).await?;
    }
    Ok(source)
}

#[tauri::command]
pub async fn update_source(
    id: String,
    title: Option<String>,
    content: Option<String>,
    state: State<'_, AppState>,
) -> Result<Source, String> {
    let conn = state.connect()?;
    let mut source = get_source(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that source.")?;
    if let Some(t) = title {
        source.title = t;
    }
    if let Some(c) = content {
        source.word_count = Some(db::word_count(&c));
        source.excerpt = Some(db::excerpt(&c));
        source.content = Some(c);
    }
    let meta = source
        .metadata
        .as_ref()
        .map(|v| serde_json::to_string(v).unwrap_or_else(|_| "{}".into()));
    conn.execute(
        "UPDATE sources SET title = ?1, content = ?2, word_count = ?3, excerpt = ?4, metadata = ?5 WHERE id = ?6",
        (
            source.title.as_str(),
            source.content.as_deref(),
            source.word_count,
            source.excerpt.as_deref(),
            meta.as_deref(),
            id.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(source)
}

#[tauri::command]
pub async fn delete_source(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    let source = get_source(id.clone(), state.clone()).await?;
    conn.execute("DELETE FROM sources WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    if let Some(source) = source {
        if source.source_type == "youtube" || source.source_type == "video" {
            conn.execute(
                "DELETE FROM sources WHERE type = 'transcript' AND metadata LIKE ?1",
                (format!("%{id}%").as_str(),),
            )
            .await
            .ok();
            conn.execute("DELETE FROM transcripts WHERE video_id IN (SELECT id FROM videos WHERE source_id = ?1)", (id.as_str(),))
                .await
                .ok();
            conn.execute("DELETE FROM videos WHERE source_id = ?1", (id.as_str(),))
                .await
                .ok();
        }
    }
    Ok(())
}
