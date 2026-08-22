use crate::db;
use crate::engines;
use crate::ids::now;
use crate::models::{GenerateArticleConfig, GenerateSocialConfig, SocialPost, WritingOutput};
use crate::AppState;
use tauri::State;

async fn save_output(
    conn: &turso::Connection,
    output: &WritingOutput,
    posts: &[SocialPost],
) -> Result<(), String> {
    let ids = serde_json::to_string(&output.source_ids).unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO writing_outputs (id, project_id, type, title, content, source_ids, tone, model, status, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        (
            output.id.as_str(),
            output.project_id.as_str(),
            output.writing_type.as_str(),
            output.title.as_deref(),
            output.content.as_str(),
            ids.as_str(),
            output.tone.as_deref(),
            output.model.as_deref(),
            output.status.as_str(),
            output.created_at.as_str(),
        ),
    )
    .await
    .map_err(|e| e.to_string())?;
    for post in posts {
        conn.execute(
            "INSERT INTO social_posts (id, output_id, idx, content) VALUES (?1, ?2, ?3, ?4)",
            (post.id.as_str(), post.output_id.as_str(), post.index, post.content.as_str()),
        )
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

fn stitch(context: &str, heading: &str) -> String {
    let body = if context.trim().is_empty() {
        "Add sources to this project, then generate again.".to_string()
    } else {
        engines::truncate_at_sentence(context, 4000)
    };
    format!("# {heading}\n\n{body}")
}

async fn llama_or_stitch(prompt: &str, fallback: String, n: u32) -> String {
    match engines::llama_complete(prompt, n).await {
        Ok(raw) => {
            if let Ok(json) = engines::extract_json(&raw) {
                if let Some(c) = json.get("content").and_then(|v| v.as_str()) {
                    return c.to_string();
                }
                if let Some(posts) = json.get("posts").and_then(|v| v.as_array()) {
                    return posts
                        .iter()
                        .filter_map(|p| p.get("content").and_then(|v| v.as_str()))
                        .collect::<Vec<_>>()
                        .join("\n\n");
                }
            }
            if raw.trim().len() > 40 {
                raw
            } else {
                fallback
            }
        }
        Err(_) => fallback,
    }
}

#[tauri::command]
pub async fn list_writing(project_id: String, state: State<'_, AppState>) -> Result<Vec<WritingOutput>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, project_id, type, title, content, source_ids, tone, model, status, created_at FROM writing_outputs WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id.as_str(),),
        db::row_writing,
    )
    .await
}

#[tauri::command]
pub async fn get_writing(id: String, state: State<'_, AppState>) -> Result<Option<WritingOutput>, String> {
    let conn = state.connect()?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, project_id, type, title, content, source_ids, tone, model, status, created_at FROM writing_outputs WHERE id = ?1",
        (id.as_str(),),
        db::row_writing,
    )
    .await?;
    Ok(rows.pop())
}

#[tauri::command]
pub async fn list_posts(output_id: String, state: State<'_, AppState>) -> Result<Vec<SocialPost>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, output_id, idx, content FROM social_posts WHERE output_id = ?1 ORDER BY idx ASC",
        (output_id.as_str(),),
        db::row_post,
    )
    .await
}

#[tauri::command]
pub async fn generate_article(
    config: GenerateArticleConfig,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    let conn = state.connect()?;
    let context = engines::truncate_at_sentence(
        &db::source_context(&conn, &config.project_id, &config.source_ids).await?,
        6000,
    );
    let title = config
        .title
        .clone()
        .filter(|t| !t.trim().is_empty())
        .unwrap_or_else(|| {
            if config.topic.trim().is_empty() {
                "Draft from project sources".into()
            } else {
                config.topic.clone()
            }
        });
    let prompt = format!(
        "TASK: WRITE_ARTICLE\nFORMAT: JSON {{\"title\":\"...\",\"content\":\"markdown\"}}\nTone: {}\nLength: {}\nTopic: {}\nSources:\n{context}",
        config.tone.as_deref().unwrap_or("professional"),
        config.length.as_deref().unwrap_or("medium"),
        config.topic
    );
    let content = llama_or_stitch(&prompt, stitch(&context, &title), 900).await;
    let output = WritingOutput {
        id: db::new_id("wrt"),
        project_id: config.project_id,
        writing_type: "article".into(),
        title: Some(title),
        content,
        source_ids: config.source_ids,
        tone: config.tone,
        model: Some("lfm2.5-350m-q4_k_m".into()),
        status: "done".into(),
        created_at: now(),
    };
    save_output(&conn, &output, &[]).await?;
    Ok(output)
}

async fn generate_social(
    writing_type: &str,
    config: GenerateSocialConfig,
    state: State<'_, AppState>,
    extra: &str,
) -> Result<WritingOutput, String> {
    let conn = state.connect()?;
    let context = engines::truncate_at_sentence(
        &db::source_context(&conn, &config.project_id, &config.source_ids).await?,
        6000,
    );
    let count = config.post_count.unwrap_or(if writing_type == "thread" { 7 } else { 1 });
    let topic = config.topic.as_deref().unwrap_or("");
    let style = config.style.as_deref().unwrap_or("");
    let prompt = format!(
        "TASK: WRITE_SOCIAL\nFORMAT: JSON {{\"posts\":[{{\"index\":1,\"content\":\"...\"}}]}}\nType: {writing_type}\nCount: {count}\nTone: {}\nTopic: {topic}\nStyle: {style}\n{extra}\nSources:\n{context}",
        config.tone.as_deref().unwrap_or("sharp")
    );
    let fallback = stitch(&context, writing_type);
    let content = llama_or_stitch(&prompt, fallback, 400).await;
    let output = WritingOutput {
        id: db::new_id("wrt"),
        project_id: config.project_id,
        writing_type: writing_type.into(),
        title: None,
        content: content.clone(),
        source_ids: config.source_ids,
        tone: config.tone,
        model: Some("lfm2.5-350m-q4_k_m".into()),
        status: "done".into(),
        created_at: now(),
    };
    let parts: Vec<String> = if writing_type == "thread" {
        content
            .split("\n\n")
            .filter(|p| !p.trim().is_empty())
            .map(|s| s.to_string())
            .collect()
    } else {
        vec![content]
    };
    let posts: Vec<SocialPost> = parts
        .into_iter()
        .enumerate()
        .map(|(i, c)| SocialPost {
            id: db::new_id("pst"),
            output_id: output.id.clone(),
            index: (i + 1) as i64,
            content: c,
        })
        .collect();
    save_output(&conn, &output, &posts).await?;
    Ok(output)
}

#[tauri::command]
pub async fn generate_x_post(config: GenerateSocialConfig, state: State<'_, AppState>) -> Result<WritingOutput, String> {
    generate_social("x_post", config, state, "Single post, under 280 characters if possible.").await
}

#[tauri::command]
pub async fn generate_thread(config: GenerateSocialConfig, state: State<'_, AppState>) -> Result<WritingOutput, String> {
    generate_social("thread", config, state, "Numbered thread.").await
}

#[tauri::command]
pub async fn generate_linkedin(config: GenerateSocialConfig, state: State<'_, AppState>) -> Result<WritingOutput, String> {
    generate_social("linkedin", config, state, "Professional LinkedIn post.").await
}

#[tauri::command]
pub async fn update_writing(id: String, content: String, state: State<'_, AppState>) -> Result<WritingOutput, String> {
    let mut item = get_writing(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that draft.")?;
    item.content = content.clone();
    let conn = state.connect()?;
    conn.execute(
        "UPDATE writing_outputs SET content = ?1 WHERE id = ?2",
        (content.as_str(), id.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub async fn update_post(id: String, content: String, state: State<'_, AppState>) -> Result<SocialPost, String> {
    let conn = state.connect()?;
    conn.execute(
        "UPDATE social_posts SET content = ?1 WHERE id = ?2",
        (content.as_str(), id.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    let mut rows = db::collect(
        &conn,
        "SELECT id, output_id, idx, content FROM social_posts WHERE id = ?1",
        (id.as_str(),),
        db::row_post,
    )
    .await?;
    let post = rows.pop().ok_or("We could not find that post.")?;
    let posts = list_posts(post.output_id.clone(), state).await?;
    let joined = posts.into_iter().map(|p| p.content).collect::<Vec<_>>().join("\n\n");
    conn.execute(
        "UPDATE writing_outputs SET content = ?1 WHERE id = ?2",
        (joined.as_str(), post.output_id.as_str()),
    )
    .await
    .ok();
    Ok(post)
}

#[tauri::command]
pub async fn delete_writing(id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    conn.execute("DELETE FROM social_posts WHERE output_id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM writing_outputs WHERE id = ?1", (id.as_str(),))
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}
