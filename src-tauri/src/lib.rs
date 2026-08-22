mod commands;
mod db;
mod engines;
mod ids;
mod jobs;
mod models;
mod schema;

use std::path::PathBuf;
use tauri::Manager;
use tokio::sync::Mutex;

pub struct AppState {
    pub db: turso::Database,
    pub data_dir: PathBuf,
    pub llama: Mutex<Option<tokio::process::Child>>,
    pub audio: Mutex<Option<tokio::process::Child>>,
}

impl AppState {
    pub fn connect(&self) -> Result<turso::Connection, String> {
        self.db.connect().map_err(|e| e.to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            let dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&dir)?;
            std::fs::create_dir_all(dir.join("models"))?;
            std::fs::create_dir_all(dir.join("projects"))?;
            std::fs::create_dir_all(dir.join("exports"))?;
            let db_path = dir.join("alfred.db");
            let db = tauri::async_runtime::block_on(db::open(&db_path.to_string_lossy()))?;
            tauri::async_runtime::block_on(db::migrate(&db))?;
            app.manage(AppState {
                db,
                data_dir: dir.clone(),
                llama: Mutex::new(None),
                audio: Mutex::new(None),
            });
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                let state = handle.state::<AppState>();
                engines::ensure_sidecars(&state.data_dir, &state.llama, &state.audio).await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::projects::list_projects,
            commands::projects::get_project,
            commands::projects::create_project,
            commands::projects::update_project,
            commands::projects::delete_project,
            commands::projects::get_project_stats,
            commands::sources::list_sources,
            commands::sources::get_source,
            commands::sources::fetch_article,
            commands::sources::add_youtube,
            commands::sources::add_text,
            commands::sources::add_source,
            commands::sources::update_source,
            commands::sources::delete_source,
            commands::sources::add_rss,
            commands::sources::add_pdf,
            commands::sources::add_epub,
            commands::videos::list_videos,
            commands::videos::get_video,
            commands::videos::add_video_from_source,
            commands::videos::add_video_from_url,
            commands::videos::add_video_from_local,
            commands::videos::delete_video,
            commands::transcripts::get_transcript,
            commands::transcripts::list_transcripts,
            commands::transcripts::generate_transcript,
            commands::transcripts::update_transcript_segment,
            commands::transcripts::diarize_transcript,
            commands::shorts::list_shorts,
            commands::shorts::get_short,
            commands::shorts::get_presets,
            commands::shorts::create_shorts,
            commands::shorts::regenerate_short,
            commands::shorts::delete_short,
            commands::shorts::export_short,
            commands::shorts::save_preset,
            commands::audio::list_audio,
            commands::audio::get_audio,
            commands::audio::generate_audio,
            commands::audio::update_audio,
            commands::audio::render_audio,
            commands::audio::regenerate_audio,
            commands::audio::delete_audio,
            commands::audio::export_audio,
            commands::audio::separate_audio,
            commands::audio::generate_podcast,
            commands::writing::list_writing,
            commands::writing::get_writing,
            commands::writing::list_posts,
            commands::writing::generate_article,
            commands::writing::generate_x_post,
            commands::writing::generate_thread,
            commands::writing::generate_linkedin,
            commands::writing::update_writing,
            commands::writing::update_post,
            commands::writing::delete_writing,
            commands::writing::rewrite_writing,
            commands::writing::export_writing,
            commands::voices::list_voices,
            commands::voices::get_voice,
            commands::voices::create_voice,
            commands::voices::delete_voice,
            commands::voices::preview_voice,
            commands::voices::preview_tts,
            commands::models::list_models,
            commands::models::install_model,
            commands::models::uninstall_model,
            commands::models::get_storage_usage,
            commands::files::read_file_as_data_url,
            commands::health::engine_health,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
