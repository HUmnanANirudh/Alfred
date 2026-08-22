use crate::ids::now;
use crate::models::Job;
use crate::models::JobStep;
use tauri::{AppHandle, Emitter};

pub fn start(job_type: &str, project_id: Option<String>, steps: Vec<(&str, Option<&str>)>) -> Job {
    let stamp = now();
    Job {
        id: crate::ids::id("job"),
        job_type: job_type.into(),
        status: "running".into(),
        project_id,
        steps: steps
            .into_iter()
            .map(|(label, engine)| JobStep {
                id: crate::ids::id("stp"),
                label: label.into(),
                status: "pending".into(),
                engine: engine.map(|e| e.into()),
            })
            .collect(),
        error: None,
        created_at: stamp.clone(),
        updated_at: stamp,
    }
}

pub fn emit(app: &AppHandle, job: &Job) {
    let _ = app.emit("job:progress", job);
}

pub fn set_step(job: &mut Job, index: usize, status: &str) {
    if let Some(step) = job.steps.get_mut(index) {
        step.status = status.into();
    }
    job.updated_at = now();
}

pub fn finish(job: &mut Job, ok: bool, error: Option<String>) {
    job.status = if ok { "done".into() } else { "error".into() };
    job.error = error;
    job.updated_at = now();
}
