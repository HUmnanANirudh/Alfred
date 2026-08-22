use crate::engines;
use crate::models::EngineHealth;

#[tauri::command]
pub async fn engine_health() -> Result<EngineHealth, String> {
    let tools = engines::tooling().await;
    Ok(EngineHealth {
        llama: engines::llama_up().await,
        audio: engines::audio_up().await,
        ffmpeg: tools.ffmpeg,
        ytdlp: tools.ytdlp,
    })
}
