use crate::engines;
use crate::models::EngineHealth;

#[tauri::command]
pub async fn engine_health() -> Result<EngineHealth, String> {
    Ok(EngineHealth {
        llama: engines::llama_up().await,
        audio: engines::audio_up().await,
        ffmpeg: engines::binary_on_path("ffmpeg"),
        ytdlp: engines::binary_on_path("yt-dlp"),
    })
}
