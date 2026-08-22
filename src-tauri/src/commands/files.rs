use base64::Engine;

/// Read a local file and return a base64 data URL.
/// Used by the frontend to play local video/audio/image files
/// when the asset:// protocol doesn't work (e.g. Linux GTK WebView).
#[tauri::command]
pub async fn read_file_as_data_url(path: String) -> Result<String, String> {
    let bytes = tokio::fs::read(&path).await.map_err(|e| {
        format!("Could not read file: {e}")
    })?;

    let mime = guess_mime(&path);
    let encoded = base64::engine::general_purpose::STANDARD.encode(&bytes);
    Ok(format!("data:{mime};base64,{encoded}"))
}

fn guess_mime(path: &str) -> &'static str {
    let lower = path.to_lowercase();
    if lower.ends_with(".mp4") || lower.ends_with(".m4v") {
        "video/mp4"
    } else if lower.ends_with(".webm") {
        "video/webm"
    } else if lower.ends_with(".ogg") || lower.ends_with(".ogv") {
        "video/ogg"
    } else if lower.ends_with(".wav") {
        "audio/wav"
    } else if lower.ends_with(".mp3") {
        "audio/mpeg"
    } else if lower.ends_with(".png") {
        "image/png"
    } else if lower.ends_with(".jpg") || lower.ends_with(".jpeg") {
        "image/jpeg"
    } else if lower.ends_with(".gif") {
        "image/gif"
    } else if lower.ends_with(".webp") {
        "image/webp"
    } else {
        "application/octet-stream"
    }
}
