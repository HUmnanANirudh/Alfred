use crate::file_server;

/// Return the local HTTP file server URL for serving video/audio files.
#[tauri::command]
pub fn get_file_server_url() -> Result<String, String> {
    file_server::get_base_url()
        .ok_or_else(|| "File server not running".into())
}

