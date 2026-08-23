use crate::ids::id;
use crate::models::*;
use crate::schema::MIGRATIONS;
use turso::{Builder, Connection, Value};

pub async fn open(path: &str) -> Result<turso::Database, String> {
    Builder::new_local(path)
        .build()
        .await
        .map_err(|e| format!("Failed to open alfred.db: {e}"))
}

pub async fn migrate(db: &turso::Database) -> Result<(), String> {
    let conn = db.connect().map_err(|e| e.to_string())?;
    for sql in MIGRATIONS {
        conn.execute(sql, ()).await.map_err(|e| e.to_string())?;
    }
    seed_voices(&conn).await?;
    seed_models(&conn).await?;
    Ok(())
}

async fn seed_voices(conn: &Connection) -> Result<(), String> {
    // Remove legacy default voices
    conn.execute("DELETE FROM voices WHERE is_cloned = 0 OR id LIKE 'vce_default_%' OR id LIKE 'vce_%'", ())
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn seed_models(conn: &Connection) -> Result<(), String> {
    let mut rows = conn
        .query("SELECT COUNT(*) FROM installed_models", ())
        .await
        .map_err(|e| e.to_string())?;
    let count = if let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        as_i64(&row.get_value(0).map_err(|e| e.to_string())?)
    } else {
        0
    };
    if count > 0 {
        return Ok(());
    }
    let models = [
        ("lfm2.5-350m-q4_k_m", "lfm2.5", "llama_cpp", "text", "LFM2.5 350M Q4", 240, "not_installed", 1),
        ("smolvlm2-256m", "smolvlm2", "llama_cpp", "vision", "SmolVLM2 256M", 180, "not_installed", 1),
        ("qwen3_asr_0_6b_q8_0", "qwen3_asr", "audio_cpp", "asr", "Qwen3 ASR 0.6B Q8", 620, "not_installed", 1),
        ("pocket_tts", "pocket_tts", "audio_cpp", "tts", "PocketTTS", 90, "not_installed", 1),
        ("chatterbox_q8", "chatterbox", "audio_cpp", "clone", "Chatterbox Q8", 410, "not_installed", 1),
        ("silero_vad", "silero_vad", "audio_cpp", "vad", "Silero VAD", 2, "installed", 1),
        ("sortformer_diar", "sortformer_diar", "audio_cpp", "diar", "Sortformer 4-speaker", 90, "not_installed", 1),
        ("htdemucs", "htdemucs", "audio_cpp", "sep", "HTDemucs", 320, "not_installed", 1),
    ];
    let _ = conn.execute("DELETE FROM installed_models WHERE id IN ('qwen3_asr_1_7b', 'supertonic', 'llama3_8b_q4')", ()).await;
    for (mid, family, engine, role, name, size, status, is_default) in models {
        conn.execute(
            "INSERT INTO installed_models (id, family, engine, role, display_name, size_bytes, status, is_default) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            (mid, family, engine, role, name, size * 1_000_000, status, is_default),
        )
        .await
        .map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn as_i64(v: &Value) -> i64 {
    match v {
        Value::Integer(n) => *n,
        Value::Real(n) => *n as i64,
        Value::Text(s) => s.parse().unwrap_or(0),
        _ => 0,
    }
}

pub fn as_f64(v: &Value) -> Option<f64> {
    match v {
        Value::Null => None,
        Value::Real(n) => Some(*n),
        Value::Integer(n) => Some(*n as f64),
        Value::Text(s) => s.parse().ok(),
        _ => None,
    }
}

pub fn as_text(v: &Value) -> Option<String> {
    match v {
        Value::Null => None,
        Value::Text(s) => Some(s.clone()),
        Value::Integer(n) => Some(n.to_string()),
        Value::Real(n) => Some(n.to_string()),
        _ => None,
    }
}

pub fn as_bool(v: &Value) -> bool {
    as_i64(v) != 0
}

pub async fn stats(conn: &Connection, project_id: &str) -> Result<ProjectStats, String> {
    async fn count(conn: &Connection, sql: &str, id: &str) -> Result<i64, String> {
        let mut rows = conn.query(sql, (id,)).await.map_err(|e| e.to_string())?;
        if let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
            Ok(as_i64(&row.get_value(0).map_err(|e| e.to_string())?))
        } else {
            Ok(0)
        }
    }
    Ok(ProjectStats {
        source_count: count(conn, "SELECT COUNT(*) FROM sources WHERE project_id = ?1", project_id).await?,
        video_count: count(conn, "SELECT COUNT(*) FROM videos WHERE project_id = ?1", project_id).await?,
        short_count: count(conn, "SELECT COUNT(*) FROM shorts WHERE project_id = ?1", project_id).await?,
        transcript_count: count(conn, "SELECT COUNT(*) FROM transcripts WHERE project_id = ?1", project_id).await?,
        draft_count: count(conn, "SELECT COUNT(*) FROM writing_outputs WHERE project_id = ?1", project_id).await?,
        audio_count: count(conn, "SELECT COUNT(*) FROM audio_generations WHERE project_id = ?1", project_id).await?,
    })
}

pub fn row_project(row: &turso::Row) -> Result<Project, String> {
    Ok(Project {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        name: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        description: as_text(&row.get_value(2).map_err(|e| e.to_string())?),
        created_at: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        updated_at: as_text(&row.get_value(4).map_err(|e| e.to_string())?).unwrap_or_default(),
        stats: None,
    })
}

pub fn row_source(row: &turso::Row) -> Result<Source, String> {
    let meta = as_text(&row.get_value(8).map_err(|e| e.to_string())?)
        .and_then(|s| serde_json::from_str(&s).ok());
    Ok(Source {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        source_type: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        title: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        content: as_text(&row.get_value(4).map_err(|e| e.to_string())?),
        url: as_text(&row.get_value(5).map_err(|e| e.to_string())?),
        word_count: {
            let v = row.get_value(6).map_err(|e| e.to_string())?;
            match &v {
                Value::Null => None,
                _ => Some(as_i64(&v)),
            }
        },
        excerpt: as_text(&row.get_value(7).map_err(|e| e.to_string())?),
        metadata: meta,
        created_at: as_text(&row.get_value(9).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn presets() -> Vec<VideoPreset> {
    vec![
        VideoPreset { id: "preset_full".into(), name: "Full Screen".into(), description: "Full-screen vertical".into(), aspect_ratio: "9:16".into(), layout: "full_screen".into() },
        VideoPreset { id: "preset_captions".into(), name: "Captions Focus".into(), description: "Large captions, speaker cropped".into(), aspect_ratio: "9:16".into(), layout: "captions_focus".into() },
        VideoPreset { id: "preset_split".into(), name: "Split Screen".into(), description: "Speaker over gameplay or B-roll".into(), aspect_ratio: "9:16".into(), layout: "split_screen".into() },
        VideoPreset { id: "preset_podcast".into(), name: "Podcast".into(), description: "Two-up conversation layout".into(), aspect_ratio: "1:1".into(), layout: "podcast".into() },
        VideoPreset { id: "preset_background".into(), name: "Speaker + Background".into(), description: "Subject keyed over a still or loop".into(), aspect_ratio: "9:16".into(), layout: "speaker_background".into() },
        VideoPreset { id: "preset_gameplay".into(), name: "Speaker + Gameplay".into(), description: "Face cam with gameplay fill".into(), aspect_ratio: "9:16".into(), layout: "speaker_gameplay".into() },
    ]
}

pub fn new_id(prefix: &str) -> String {
    id(prefix)
}

pub fn excerpt(s: &str) -> String {
    let t = s.trim();
    if t.chars().count() <= 200 {
        t.to_string()
    } else {
        format!("{}…", t.chars().take(200).collect::<String>())
    }
}

pub fn word_count(s: &str) -> i64 {
    s.split_whitespace().count() as i64
}

pub fn youtube_id(url: &str) -> Option<String> {
    let re = regex::Regex::new(r"(?:v=|youtu\.be/|shorts/)([A-Za-z0-9_-]{11})").ok()?;
    re.captures(url).and_then(|c| c.get(1).map(|m| m.as_str().to_string()))
}

pub fn row_video(row: &turso::Row) -> Result<Video, String> {
    Ok(Video {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        source_id: as_text(&row.get_value(2).map_err(|e| e.to_string())?),
        title: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        duration: as_f64(&row.get_value(4).map_err(|e| e.to_string())?),
        file_path: as_text(&row.get_value(5).map_err(|e| e.to_string())?),
        thumbnail_path: as_text(&row.get_value(6).map_err(|e| e.to_string())?),
        url: as_text(&row.get_value(7).map_err(|e| e.to_string())?),
        has_transcript: as_bool(&row.get_value(8).map_err(|e| e.to_string())?),
        created_at: as_text(&row.get_value(9).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_transcript(row: &turso::Row) -> Result<Transcript, String> {
    let segs = as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_else(|| "[]".into());
    Ok(Transcript {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        video_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        segments: serde_json::from_str(&segs).unwrap_or(serde_json::json!([])),
        language: as_text(&row.get_value(4).map_err(|e| e.to_string())?),
        engine: as_text(&row.get_value(5).map_err(|e| e.to_string())?),
        created_at: as_text(&row.get_value(6).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_short(row: &turso::Row) -> Result<Short, String> {
    Ok(Short {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        video_id: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        preset_id: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        title: as_text(&row.get_value(4).map_err(|e| e.to_string())?),
        duration: as_f64(&row.get_value(5).map_err(|e| e.to_string())?),
        file_path: as_text(&row.get_value(6).map_err(|e| e.to_string())?),
        thumbnail_path: as_text(&row.get_value(7).map_err(|e| e.to_string())?),
        hook: as_text(&row.get_value(8).map_err(|e| e.to_string())?),
        confidence: as_f64(&row.get_value(9).map_err(|e| e.to_string())?),
        transcript_excerpt: as_text(&row.get_value(10).map_err(|e| e.to_string())?),
        captions_enabled: as_bool(&row.get_value(11).map_err(|e| e.to_string())?),
        caption_style: as_text(&row.get_value(12).map_err(|e| e.to_string())?),
        status: as_text(&row.get_value(13).map_err(|e| e.to_string())?).unwrap_or_else(|| "idle".into()),
        created_at: as_text(&row.get_value(14).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_audio(row: &turso::Row) -> Result<AudioGeneration, String> {
    let ids = as_text(&row.get_value(10).map_err(|e| e.to_string())?)
        .and_then(|s| serde_json::from_str(&s).ok());
    Ok(AudioGeneration {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        voice_id: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        voice_name: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        title: as_text(&row.get_value(4).map_err(|e| e.to_string())?),
        script: as_text(&row.get_value(5).map_err(|e| e.to_string())?).unwrap_or_default(),
        duration: as_f64(&row.get_value(6).map_err(|e| e.to_string())?),
        file_path: as_text(&row.get_value(7).map_err(|e| e.to_string())?),
        engine: as_text(&row.get_value(8).map_err(|e| e.to_string())?),
        status: as_text(&row.get_value(9).map_err(|e| e.to_string())?).unwrap_or_else(|| "idle".into()),
        source_ids: ids,
        created_at: as_text(&row.get_value(11).map_err(|e| e.to_string())?).unwrap_or_default(),
        updated_at: as_text(&row.get_value(12).map_err(|e| e.to_string())?),
    })
}

pub fn row_writing(row: &turso::Row) -> Result<WritingOutput, String> {
    let ids = as_text(&row.get_value(5).map_err(|e| e.to_string())?).unwrap_or_else(|| "[]".into());
    Ok(WritingOutput {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        project_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        writing_type: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        title: as_text(&row.get_value(3).map_err(|e| e.to_string())?),
        content: as_text(&row.get_value(4).map_err(|e| e.to_string())?).unwrap_or_default(),
        source_ids: serde_json::from_str(&ids).unwrap_or_default(),
        tone: as_text(&row.get_value(6).map_err(|e| e.to_string())?),
        model: as_text(&row.get_value(7).map_err(|e| e.to_string())?),
        status: as_text(&row.get_value(8).map_err(|e| e.to_string())?).unwrap_or_else(|| "idle".into()),
        created_at: as_text(&row.get_value(9).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_post(row: &turso::Row) -> Result<SocialPost, String> {
    Ok(SocialPost {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        output_id: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        index: as_i64(&row.get_value(2).map_err(|e| e.to_string())?),
        content: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_voice(row: &turso::Row) -> Result<Voice, String> {
    Ok(Voice {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        name: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        sample_path: as_text(&row.get_value(2).map_err(|e| e.to_string())?),
        engine: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        is_default: as_bool(&row.get_value(4).map_err(|e| e.to_string())?),
        is_cloned: as_bool(&row.get_value(5).map_err(|e| e.to_string())?),
        created_at: as_text(&row.get_value(6).map_err(|e| e.to_string())?).unwrap_or_default(),
    })
}

pub fn row_model(row: &turso::Row) -> Result<AiModel, String> {
    let bytes = as_i64(&row.get_value(6).map_err(|e| e.to_string())?);
    Ok(AiModel {
        id: as_text(&row.get_value(0).map_err(|e| e.to_string())?).unwrap_or_default(),
        family: as_text(&row.get_value(1).map_err(|e| e.to_string())?).unwrap_or_default(),
        engine: as_text(&row.get_value(2).map_err(|e| e.to_string())?).unwrap_or_default(),
        role: as_text(&row.get_value(3).map_err(|e| e.to_string())?).unwrap_or_default(),
        display_name: as_text(&row.get_value(4).map_err(|e| e.to_string())?).unwrap_or_default(),
        file_path: as_text(&row.get_value(5).map_err(|e| e.to_string())?),
        size_mb: if bytes > 0 { Some(bytes / 1_000_000) } else { None },
        status: as_text(&row.get_value(7).map_err(|e| e.to_string())?).unwrap_or_default(),
        is_default: as_bool(&row.get_value(8).map_err(|e| e.to_string())?),
        installed_at: as_text(&row.get_value(9).map_err(|e| e.to_string())?),
    })
}

pub async fn collect<F, T>(
    conn: &Connection,
    sql: &str,
    params: impl turso::IntoParams,
    map: F,
) -> Result<Vec<T>, String>
where
    F: Fn(&turso::Row) -> Result<T, String>,
{
    let mut rows = conn.query(sql, params).await.map_err(|e| e.to_string())?;
    let mut out = Vec::new();
    while let Some(row) = rows.next().await.map_err(|e| e.to_string())? {
        out.push(map(&row)?);
    }
    Ok(out)
}

pub async fn source_context(
    conn: &Connection,
    project_id: &str,
    source_ids: &[String],
) -> Result<String, String> {
    let sources = collect(
        conn,
        "SELECT id, project_id, type, title, content, url, word_count, excerpt, metadata, created_at FROM sources WHERE project_id = ?1 ORDER BY created_at DESC",
        (project_id,),
        row_source,
    )
    .await?;
    let selected: Vec<_> = if source_ids.is_empty() {
        sources
    } else {
        sources
            .into_iter()
            .filter(|s| source_ids.contains(&s.id))
            .collect()
    };
    Ok(selected
        .into_iter()
        .map(|s| {
            format!(
                "# {}\n{}",
                s.title,
                s.content.unwrap_or_else(|| s.excerpt.unwrap_or_default())
            )
        })
        .collect::<Vec<_>>()
        .join("\n\n"))
}
