use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
    pub stats: Option<ProjectStats>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProjectStats {
    pub source_count: i64,
    pub video_count: i64,
    pub short_count: i64,
    pub transcript_count: i64,
    pub draft_count: i64,
    pub audio_count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Source {
    #[serde(default)]
    pub id: String,
    pub project_id: String,
    #[serde(rename = "type")]
    pub source_type: String,
    pub title: String,
    pub content: Option<String>,
    pub url: Option<String>,
    pub word_count: Option<i64>,
    pub excerpt: Option<String>,
    pub metadata: Option<serde_json::Value>,
    #[serde(default)]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Video {
    pub id: String,
    pub project_id: String,
    pub source_id: Option<String>,
    pub title: String,
    pub duration: Option<f64>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub url: Option<String>,
    pub has_transcript: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transcript {
    pub id: String,
    pub video_id: String,
    pub project_id: String,
    pub segments: serde_json::Value,
    pub language: Option<String>,
    pub engine: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Short {
    pub id: String,
    pub project_id: String,
    pub video_id: String,
    pub preset_id: String,
    pub title: Option<String>,
    pub duration: Option<f64>,
    pub file_path: Option<String>,
    pub thumbnail_path: Option<String>,
    pub hook: Option<String>,
    pub confidence: Option<f64>,
    pub transcript_excerpt: Option<String>,
    pub captions_enabled: bool,
    pub caption_style: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AudioGeneration {
    pub id: String,
    pub project_id: String,
    pub voice_id: String,
    pub voice_name: String,
    pub title: Option<String>,
    pub script: String,
    pub duration: Option<f64>,
    pub file_path: Option<String>,
    pub engine: Option<String>,
    pub status: String,
    pub source_ids: Option<Vec<String>>,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WritingOutput {
    pub id: String,
    pub project_id: String,
    #[serde(rename = "type")]
    pub writing_type: String,
    pub title: Option<String>,
    pub content: String,
    pub source_ids: Vec<String>,
    pub tone: Option<String>,
    pub model: Option<String>,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocialPost {
    pub id: String,
    pub output_id: String,
    pub index: i64,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Voice {
    pub id: String,
    pub name: String,
    pub sample_path: Option<String>,
    pub engine: String,
    pub is_default: bool,
    pub is_cloned: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiModel {
    pub id: String,
    pub family: String,
    pub engine: String,
    pub role: String,
    pub display_name: String,
    pub file_path: Option<String>,
    pub size_mb: Option<i64>,
    pub status: String,
    pub is_default: bool,
    pub installed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoPreset {
    pub id: String,
    pub name: String,
    pub description: String,
    pub aspect_ratio: String,
    pub layout: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Job {
    pub id: String,
    #[serde(rename = "type")]
    pub job_type: String,
    pub status: String,
    pub project_id: Option<String>,
    pub steps: Vec<JobStep>,
    pub error: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JobStep {
    pub id: String,
    pub label: String,
    pub status: String,
    pub engine: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineHealth {
    pub llama: bool,
    pub audio: bool,
    pub ffmpeg: bool,
    pub ytdlp: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StorageUsage {
    pub projects: u64,
    pub models: u64,
    pub exports: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FetchArticleResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddYoutubeResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<Source>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateShortConfig {
    pub project_id: String,
    pub video_id: Option<String>,
    pub source_ids: Option<Vec<String>>,
    pub preset_id: String,
    pub captions_enabled: bool,
    pub caption_style: Option<String>,
    pub find_clips_auto: bool,
    pub number_of_clips: i64,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateAudioConfig {
    pub project_id: String,
    pub voice_id: String,
    pub script: String,
    pub title: Option<String>,
    pub source_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateArticleConfig {
    pub project_id: String,
    pub title: Option<String>,
    pub topic: String,
    pub source_ids: Vec<String>,
    pub tone: Option<String>,
    pub length: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenerateSocialConfig {
    pub project_id: String,
    pub topic: Option<String>,
    pub source_ids: Vec<String>,
    pub tone: Option<String>,
    pub style: Option<String>,
    pub post_count: Option<i64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LlmTokenEvent {
    pub token: String,
}
