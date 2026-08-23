use crate::db;
use crate::engines;
use crate::ids::now;
use crate::models::{GenerateArticleConfig, GenerateSocialConfig, SocialPost, WritingOutput};
use crate::AppState;
use tauri::{AppHandle, State};

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

fn title_from_markdown(content: &str, fallback: &str) -> String {
    for line in content.lines() {
        let trimmed = line.trim();
        if let Some(rest) = trimmed.strip_prefix("# ") {
            let title = rest.trim();
            if !title.is_empty() {
                return title.to_string();
            }
        }
    }
    fallback.to_string()
}

async fn llama_stream_required(app: &AppHandle, prompt: &str, n: u32) -> Result<String, String> {
    engines::llama_stream(prompt, n, app).await
}

fn posts_from_markdown(writing_type: &str, content: &str, output_id: &str) -> Vec<SocialPost> {
    let parts: Vec<String> = if writing_type == "thread" {
        content
            .split("\n\n")
            .map(|p| p.trim().to_string())
            .filter(|p| !p.is_empty())
            .collect()
    } else {
        vec![content.trim().to_string()]
    };
    parts
        .into_iter()
        .enumerate()
        .map(|(i, c)| SocialPost {
            id: db::new_id("pst"),
            output_id: output_id.to_string(),
            index: (i + 1) as i64,
            content: c,
        })
        .collect()
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
    app: AppHandle,
    config: GenerateArticleConfig,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    let conn = state.connect()?;
    let context = engines::truncate_at_sentence(
        &db::source_context(&conn, &config.project_id, &config.source_ids).await?,
        6000,
    );
    let fallback_title = "Draft from project sources".to_string();
    let prompt = format!(
        "Write a markdown article. Start with a single # heading. Output markdown only — no JSON, no preamble, no closing remarks about being an AI.\nTone: {}\nLength: {}\n\nUse only these sources:\n{context}",
        config.tone.as_deref().unwrap_or("professional"),
        config.length.as_deref().unwrap_or("medium")
    );
    let content = llama_stream_required(&app, &prompt, 900).await?;
    let title = title_from_markdown(&content, &fallback_title);
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
    app: AppHandle,
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
    let format = if writing_type == "thread" {
        format!("Write a numbered thread of {count} posts. Each post is its own paragraph, starting with 1/, 2/, and so on. Markdown/plain text only — no JSON.")
    } else if writing_type == "linkedin" {
        "Write one LinkedIn post in markdown. No JSON, no preamble.".to_string()
    } else {
        "Write one short social post as plain text. Stay under 280 characters if possible. No JSON, no quotes wrapping the whole post.".to_string()
    };
    let prompt = format!(
        "{format}\nTone: {}\nTopic: {topic}\nStyle: {style}\n{extra}\n\nUse only these sources:\n{context}",
        config.tone.as_deref().unwrap_or("sharp")
    );
    let content = llama_stream_required(&app, &prompt, 400).await?;
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
    let posts = posts_from_markdown(writing_type, &content, &output.id);
    save_output(&conn, &output, &posts).await?;
    Ok(output)
}

#[tauri::command]
pub async fn generate_x_post(
    app: AppHandle,
    config: GenerateSocialConfig,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    generate_social(app, "x_post", config, state, "Single post.").await
}

#[tauri::command]
pub async fn generate_thread(
    app: AppHandle,
    config: GenerateSocialConfig,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    generate_social(app, "thread", config, state, "Numbered thread.").await
}

#[tauri::command]
pub async fn generate_linkedin(
    app: AppHandle,
    config: GenerateSocialConfig,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    generate_social(app, "linkedin", config, state, "Professional LinkedIn post.").await
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

#[tauri::command]
pub async fn rewrite_writing(
    app: AppHandle,
    id: String,
    action: String,
    selection: Option<String>,
    tone: Option<String>,
    state: State<'_, AppState>,
) -> Result<WritingOutput, String> {
    let mut item = get_writing(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that draft.")?;
    let target = selection
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or(item.content.as_str());
    let instruction = match action.as_str() {
        "expand" => "Expand this passage with more concrete detail. Keep the same claims. Markdown only.",
        "shorten" => "Shorten this passage. Keep the same claims. Markdown only.",
        _ => "Rewrite this passage more clearly. Keep the same claims. Markdown only.",
    };
    let prompt = format!(
        "{instruction}\nTone: {}\n\nPassage:\n{target}",
        tone.as_deref().or(item.tone.as_deref()).unwrap_or("professional")
    );
    let rewritten = llama_stream_required(&app, &prompt, 700).await?;
    if let Some(sel) = selection.filter(|s| !s.trim().is_empty()) {
        item.content = item.content.replacen(&sel, rewritten.trim(), 1);
    } else {
        item.content = rewritten;
    }
    let conn = state.connect()?;
    conn.execute(
        "UPDATE writing_outputs SET content = ?1 WHERE id = ?2",
        (item.content.as_str(), id.as_str()),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(item)
}

#[tauri::command]
pub async fn export_writing(id: String, format: String, state: State<'_, AppState>) -> Result<String, String> {
    let item = get_writing(id.clone(), state.clone())
        .await?
        .ok_or("We could not find that draft.")?;
    let ext = if format == "txt" { "txt" } else { "md" };
    let dest = state.data_dir.join("exports").join(format!("{id}.{ext}"));
    std::fs::create_dir_all(dest.parent().unwrap()).map_err(|e| e.to_string())?;
    std::fs::write(&dest, item.content).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}
