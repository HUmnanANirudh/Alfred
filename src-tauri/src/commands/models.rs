use crate::db;
use crate::engines;
use crate::ids::now;
use crate::jobs;
use crate::models::{AiModel, Job, StorageUsage};
use crate::AppState;
use tauri::{AppHandle, State};

#[tauri::command]
pub async fn list_models(state: State<'_, AppState>) -> Result<Vec<AiModel>, String> {
    let conn = state.connect()?;
    db::collect(
        &conn,
        "SELECT id, family, engine, role, display_name, file_path, size_bytes, status, is_default, installed_at FROM installed_models ORDER BY role ASC",
        (),
        db::row_model,
    )
    .await
}

#[tauri::command]
pub async fn install_model(app: AppHandle, model_id: String, state: State<'_, AppState>) -> Result<Job, String> {
    let conn = state.connect()?;
    conn.execute(
        "UPDATE installed_models SET status = 'downloading' WHERE id = ?1",
        (model_id.as_str(),),
    )
    .await
    .map_err(|e| e.to_string())?;
    let mut job = jobs::start(
        "clone_voice",
        None,
        vec![
            ("Fetching package", None),
            ("Writing files", None),
            ("Verifying", None),
        ],
    );
    jobs::emit(&app, &job);
    jobs::set_step(&mut job, 0, "running");
    jobs::emit(&app, &job);

    let mut models = db::collect(
        &conn,
        "SELECT id, family, engine, role, display_name, file_path, size_bytes, status, is_default, installed_at FROM installed_models WHERE id = ?1",
        (model_id.as_str(),),
        db::row_model,
    )
    .await?;
    let model = models.pop();
    let engine = model.as_ref().map(|m| m.engine.as_str()).unwrap_or("audio_cpp");
    let models_dir = state.data_dir.join("models");
    let _ = std::fs::create_dir_all(&models_dir);

    let mut ok = true;
    let mut err = None;
    if engine == "audio_cpp" {
        match engines::install_audio_model(&model_id, &models_dir).await {
            Ok(()) => {}
            Err(e) => {
                ok = false;
                err = Some(e);
            }
        }
    } else {
        ok = false;
        err = Some("Place the GGUF in the models folder or start llama-server with ALFRED_LLAMA_MODEL.".into());
    }

    jobs::set_step(&mut job, 0, if ok { "done" } else { "error" });
    jobs::set_step(&mut job, 1, if ok { "done" } else { "pending" });
    jobs::set_step(&mut job, 2, if ok { "done" } else { "pending" });
    if ok {
        conn.execute(
            "UPDATE installed_models SET status = 'installed', installed_at = ?1 WHERE id = ?2",
            (now().as_str(), model_id.as_str()),
        )
        .await
        .ok();
        jobs::finish(&mut job, true, None);
    } else {
        conn.execute(
            "UPDATE installed_models SET status = 'not_installed' WHERE id = ?1",
            (model_id.as_str(),),
        )
        .await
        .ok();
        jobs::finish(&mut job, false, err);
    }
    jobs::emit(&app, &job);
    Ok(job)
}

#[tauri::command]
pub async fn uninstall_model(model_id: String, state: State<'_, AppState>) -> Result<(), String> {
    let conn = state.connect()?;
    conn.execute(
        "UPDATE installed_models SET status = 'not_installed', installed_at = NULL WHERE id = ?1",
        (model_id.as_str(),),
    )
    .await
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn get_storage_usage(state: State<'_, AppState>) -> Result<StorageUsage, String> {
    Ok(StorageUsage {
        projects: engines::dir_size(&state.data_dir.join("projects")),
        models: engines::dir_size(&state.data_dir.join("models")),
        exports: engines::dir_size(&state.data_dir.join("exports")),
    })
}
