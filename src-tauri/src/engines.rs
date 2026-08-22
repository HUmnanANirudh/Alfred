use std::path::Path;
use std::sync::OnceLock;
use std::time::{Duration, Instant};

use serde_json::{json, Value};
use tokio::process::Command;
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter};

use crate::models::LlmTokenEvent;

const LLAMA: &str = "http://127.0.0.1:8765";
const AUDIO: &str = "http://127.0.0.1:8766";

struct BinaryCache {
    checked_at: Instant,
    ffmpeg: bool,
    ytdlp: bool,
    llama_bin: bool,
    audio_bin: bool,
}

static BINARIES: OnceLock<Mutex<Option<BinaryCache>>> = OnceLock::new();

fn binary_cache() -> &'static Mutex<Option<BinaryCache>> {
    BINARIES.get_or_init(|| Mutex::new(None))
}

pub async fn llama_up() -> bool {
    reqwest::Client::new()
        .get(format!("{LLAMA}/health"))
        .timeout(Duration::from_millis(400))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

pub async fn audio_up() -> bool {
    reqwest::Client::new()
        .get(format!("{AUDIO}/health"))
        .timeout(Duration::from_millis(400))
        .send()
        .await
        .map(|r| r.status().is_success())
        .unwrap_or(false)
}

async fn command_exists(name: &str) -> bool {
    Command::new(name)
        .arg("--version")
        .output()
        .await
        .map(|o| o.status.success() || !o.stdout.is_empty() || !o.stderr.is_empty())
        .unwrap_or(false)
}

pub struct Tooling {
    pub ffmpeg: bool,
    pub ytdlp: bool,
    pub llama_server: bool,
    pub audiocpp_server: bool,
}

pub async fn tooling() -> Tooling {
    let mut guard = binary_cache().lock().await;
    if let Some(cache) = guard.as_ref() {
        if cache.checked_at.elapsed() < Duration::from_secs(30) {
            return Tooling {
                ffmpeg: cache.ffmpeg,
                ytdlp: cache.ytdlp,
                llama_server: cache.llama_bin,
                audiocpp_server: cache.audio_bin,
            };
        }
    }
    let ffmpeg = command_exists("ffmpeg").await;
    let ytdlp = command_exists("yt-dlp").await;
    let llama_bin = command_exists("llama-server").await;
    let audio_bin = command_exists("audiocpp_server").await;
    *guard = Some(BinaryCache {
        checked_at: Instant::now(),
        ffmpeg,
        ytdlp,
        llama_bin,
        audio_bin,
    });
    Tooling {
        ffmpeg,
        ytdlp,
        llama_server: llama_bin,
        audiocpp_server: audio_bin,
    }
}

pub async fn llama_complete(prompt: &str, n_predict: u32) -> Result<String, String> {
    let client = reqwest::Client::new();
    let mut last = String::new();
    for _ in 0..3 {
        let res = client
            .post(format!("{LLAMA}/completion"))
            .timeout(Duration::from_secs(120))
            .json(&json!({
                "prompt": prompt,
                "n_predict": n_predict,
                "temperature": 0.3,
                "stop": ["<|eot_id|>", "<|im_end|>"]
            }))
            .send()
            .await
            .map_err(|e| format!("llama.cpp is not reachable on :8765 ({e})"))?;
        let body: Value = res.json().await.map_err(|e| e.to_string())?;
        let content = body
            .get("content")
            .and_then(|v| v.as_str())
            .or_else(|| body.get("response").and_then(|v| v.as_str()))
            .unwrap_or("")
            .trim()
            .to_string();
        last = content.clone();
        if looks_like_json(&content) || !content.is_empty() {
            return Ok(content);
        }
    }
    Err(format!("LFM2.5 returned unusable output: {last}"))
}

pub async fn llama_stream(prompt: &str, n_predict: u32, app: &AppHandle) -> Result<String, String> {
    use futures_util::StreamExt;

    let _ = app.emit("llm:start", true);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{LLAMA}/completion"))
        .timeout(Duration::from_secs(180))
        .json(&json!({
            "prompt": prompt,
            "n_predict": n_predict,
            "temperature": 0.3,
            "stream": true,
            "stop": ["<|eot_id|>", "<|im_end|>"]
        }))
        .send()
        .await
        .map_err(|e| format!("llama.cpp is not reachable on :8765 ({e})"))?;

    if !res.status().is_success() {
        return Err(format!("llama.cpp returned {}", res.status()));
    }

    let mut stream = res.bytes_stream();
    let mut buf = String::new();
    let mut full = String::new();

    while let Some(item) = stream.next().await {
        let chunk = item.map_err(|e| e.to_string())?;
        buf.push_str(&String::from_utf8_lossy(&chunk));
        while let Some(idx) = buf.find('\n') {
            let mut line = buf[..idx].to_string();
            buf.drain(..=idx);
            if line.ends_with('\r') {
                line.pop();
            }
            let line = line.trim();
            if line.is_empty() || line == "data: [DONE]" || line == "[DONE]" {
                continue;
            }
            let json_str = line.strip_prefix("data:").map(str::trim).unwrap_or(line);
            let Ok(v) = serde_json::from_str::<Value>(json_str) else {
                continue;
            };
            let Some(token) = v.get("content").and_then(|c| c.as_str()) else {
                continue;
            };
            if token.is_empty() {
                continue;
            }
            full.push_str(token);
            let _ = app.emit("llm:token", LlmTokenEvent { token: token.to_string() });
        }
    }

    if full.trim().is_empty() {
        return Err("LFM2.5 returned an empty stream.".into());
    }
    let _ = app.emit("llm:done", true);
    Ok(full)
}

pub fn extract_json(raw: &str) -> Result<Value, String> {
    let trimmed = raw.trim();
    if let Ok(v) = serde_json::from_str::<Value>(trimmed) {
        return Ok(v);
    }
    if let Some(start) = trimmed.find('{') {
        if let Some(end) = trimmed.rfind('}') {
            return serde_json::from_str(&trimmed[start..=end]).map_err(|e| e.to_string());
        }
    }
    if let Some(start) = trimmed.find('[') {
        if let Some(end) = trimmed.rfind(']') {
            return serde_json::from_str(&trimmed[start..=end]).map_err(|e| e.to_string());
        }
    }
    Err("No JSON object in model output".into())
}

fn looks_like_json(s: &str) -> bool {
    let t = s.trim();
    (t.starts_with('{') && t.contains('}')) || (t.starts_with('[') && t.contains(']'))
}

pub async fn audio_tts(script: &str, out_path: &str) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/audio/speech"))
        .timeout(Duration::from_secs(180))
        .json(&json!({
            "input": script,
            "model": "tts"
        }))
        .send()
        .await
        .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    if !res.status().is_success() {
        return Err(format!("TTS failed: {}", res.status()));
    }
    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    tokio::fs::write(out_path, bytes)
        .await
        .map_err(|e| e.to_string())
}

pub struct AsrResult {
    pub text: String,
    pub segments: Vec<Value>,
}

pub async fn audio_transcribe(file_path: &str) -> Result<AsrResult, String> {
    let bytes = tokio::fs::read(file_path).await.map_err(|e| e.to_string())?;
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("response_format", "verbose_json");
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/audio/transcriptions"))
        .timeout(Duration::from_secs(300))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    let text = body
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let segments = parse_asr_segments(&body);
    Ok(AsrResult { text, segments })
}

fn parse_asr_segments(body: &Value) -> Vec<Value> {
    let Some(arr) = body.get("segments").and_then(|v| v.as_array()) else {
        return Vec::new();
    };
    arr.iter()
        .enumerate()
        .map(|(i, seg)| {
            json!({
                "id": crate::ids::id("seg"),
                "start": seg.get("start").and_then(|v| v.as_f64()).unwrap_or(0.0),
                "end": seg.get("end").and_then(|v| v.as_f64()).unwrap_or(0.0),
                "text": seg.get("text").and_then(|v| v.as_str()).unwrap_or("").trim(),
                "speaker": "Speaker 1",
                "confidence": seg.get("avg_logprob").and_then(|v| v.as_f64()).map(|n| (n + 1.0).clamp(0.0, 1.0)).unwrap_or(0.9),
                "index": i
            })
        })
        .filter(|s| s.get("text").and_then(|v| v.as_str()).is_some_and(|t| !t.is_empty()))
        .collect()
}

pub async fn ytdlp_info(url: &str) -> Result<Value, String> {
    let output = Command::new("yt-dlp")
        .args(["-j", "--no-download", "--no-warnings", url])
        .output()
        .await
        .map_err(|_| "yt-dlp is not installed on this machine.".to_string())?;
    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr);
        if err.to_lowercase().contains("private") {
            return Err("private_video".into());
        }
        return Err("network_error".into());
    }
    serde_json::from_slice(&output.stdout).map_err(|_| "network_error".into())
}

pub async fn ytdlp_download(url: &str, out_template: &str) -> Result<(), String> {
    let status = Command::new("yt-dlp")
        .args([
            "-f",
            "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
            "-o",
            out_template,
            url,
        ])
        .status()
        .await
        .map_err(|_| "yt-dlp is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("yt-dlp could not download that video.".into())
    }
}

pub async fn ffmpeg_extract_wav(input: &str, output: &str) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args([
            "-y", "-i", input, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output,
        ])
        .status()
        .await
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not extract audio from that file.".into())
    }
}

pub async fn ffmpeg_cut_clip(input: &str, start: f64, duration: f64, output: &str) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args([
            "-y",
            "-ss",
            &format!("{start:.2}"),
            "-t",
            &format!("{duration:.2}"),
            "-i",
            input,
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            output,
        ])
        .status()
        .await
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not render that clip.".into())
    }
}

pub async fn ffprobe_duration(path: &str) -> Option<f64> {
    if path.is_empty() {
        return None;
    }
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            path,
        ])
        .output()
        .await
        .ok()?;
    if !output.status.success() {
        return None;
    }
    String::from_utf8_lossy(&output.stdout).trim().parse().ok()
}

pub async fn install_audio_model(model_id: &str, models_dir: &Path) -> Result<(), String> {
    let status = Command::new("audiocpp_model_manager")
        .args([
            "install",
            model_id,
            "--models-dir",
            &models_dir.to_string_lossy(),
        ])
        .status()
        .await
        .map_err(|_| "audiocpp_model_manager is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("audiocpp_model_manager could not install that package.".into())
    }
}

pub fn unlink(path: Option<&str>) {
    if let Some(p) = path {
        if !p.is_empty() {
            let _ = std::fs::remove_file(p);
        }
    }
}

pub fn dir_size(path: &Path) -> u64 {
    let mut total = 0u64;
    let walker = match std::fs::read_dir(path) {
        Ok(w) => w,
        Err(_) => return 0,
    };
    for entry in walker.flatten() {
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        if meta.is_dir() {
            total += dir_size(&entry.path());
        } else {
            total += meta.len();
        }
    }
    total
}

fn find_gguf(dir: &Path) -> Option<String> {
    let mut stack = vec![dir.to_path_buf()];
    while let Some(current) = stack.pop() {
        let Ok(entries) = std::fs::read_dir(&current) else {
            continue;
        };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path.extension().and_then(|e| e.to_str()) == Some("gguf") {
                return Some(path.to_string_lossy().into_owned());
            }
        }
    }
    None
}

/// Start llama-server / audiocpp_server when they are on PATH and not already healthy.
pub async fn ensure_sidecars(
    data_dir: &Path,
    llama: &Mutex<Option<tokio::process::Child>>,
    audio: &Mutex<Option<tokio::process::Child>>,
) {
    let tools = tooling().await;
    if !llama_up().await && tools.llama_server {
        let model = std::env::var("ALFRED_LLAMA_MODEL")
            .ok()
            .filter(|s| !s.is_empty())
            .or_else(|| find_gguf(&data_dir.join("models")));
        if let Some(model) = model {
            match Command::new("llama-server")
                .args([
                    "--model",
                    &model,
                    "--port",
                    "8765",
                    "--ctx-size",
                    "4096",
                    "--host",
                    "127.0.0.1",
                ])
                .kill_on_drop(true)
                .spawn()
            {
                Ok(child) => {
                    *llama.lock().await = Some(child);
                }
                Err(_) => {}
            }
        }
    }

    if !audio_up().await && tools.audiocpp_server {
        let mut cmd = Command::new("audiocpp_server");
        cmd.args(["--host", "127.0.0.1", "--port", "8766"]);
        if let Ok(config) = std::env::var("ALFRED_AUDIO_CONFIG") {
            cmd.args(["--config", &config]);
        }
        match cmd.kill_on_drop(true).spawn() {
            Ok(child) => {
                *audio.lock().await = Some(child);
            }
            Err(_) => {}
        }
    }
}

pub async fn fetch_url_text(url: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Alfred/0.1 (local research)")
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    let html = client
        .get(url)
        .send()
        .await
        .map_err(|_| "network_error".to_string())?
        .text()
        .await
        .map_err(|_| "extraction_failed".to_string())?;
    let text = extract_article(&html);
    if text.split_whitespace().count() < 40 {
        return Err("extraction_failed".into());
    }
    Ok(text)
}

fn extract_article(html: &str) -> String {
    let document = scraper::Html::parse_document(html);
    let candidates = [
        "article",
        "main",
        "[role=main]",
        ".post-content",
        ".article-body",
        ".entry-content",
        "#content",
    ];
    for sel in candidates {
        if let Ok(selector) = scraper::Selector::parse(sel) {
            if let Some(node) = document.select(&selector).next() {
                let text = collect_text(node);
                if text.split_whitespace().count() > 80 {
                    return text;
                }
            }
        }
    }
    if let Ok(selector) = scraper::Selector::parse("p") {
        let joined = document
            .select(&selector)
            .map(collect_text)
            .filter(|t| t.split_whitespace().count() > 12)
            .collect::<Vec<_>>()
            .join("\n\n");
        if joined.split_whitespace().count() > 40 {
            return joined;
        }
    }
    collect_text_document(&document)
}

fn collect_text(el: scraper::ElementRef<'_>) -> String {
    normalize_ws(&el.text().collect::<Vec<_>>().join(" "))
}

fn collect_text_document(document: &scraper::Html) -> String {
    if let Ok(selector) = scraper::Selector::parse("body") {
        if let Some(body) = document.select(&selector).next() {
            return collect_text(body);
        }
    }
    String::new()
}

fn normalize_ws(s: &str) -> String {
    s.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub fn truncate_at_sentence(s: &str, max_chars: usize) -> String {
    if s.chars().count() <= max_chars {
        return s.to_string();
    }
    let cut: String = s.chars().take(max_chars).collect();
    cut.rfind(['.', '!', '?', '\n'])
        .map(|i| cut[..=i].trim().to_string())
        .filter(|t| t.split_whitespace().count() > 8)
        .unwrap_or_else(|| cut.trim().to_string())
}
