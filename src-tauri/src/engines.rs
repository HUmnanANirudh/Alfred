use std::process::Command;
use std::time::Duration;

use serde_json::{json, Value};

const LLAMA: &str = "http://127.0.0.1:8765";
const AUDIO: &str = "http://127.0.0.1:8766";

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

pub fn binary_on_path(name: &str) -> bool {
    Command::new(name).arg("-version").output().is_ok()
        || Command::new(name).arg("--version").output().is_ok()
        || Command::new(name).arg("-h").output().is_ok()
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
    std::fs::write(out_path, bytes).map_err(|e| e.to_string())
}

pub async fn audio_transcribe(file_path: &str) -> Result<String, String> {
    let bytes = std::fs::read(file_path).map_err(|e| e.to_string())?;
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new().part("file", part);
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/audio/transcriptions"))
        .timeout(Duration::from_secs(300))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    let body: Value = res.json().await.map_err(|e| e.to_string())?;
    Ok(body
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string())
}

pub fn ytdlp_info(url: &str) -> Result<Value, String> {
    let output = Command::new("yt-dlp")
        .args(["-j", "--no-download", "--no-warnings", url])
        .output()
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

pub fn ytdlp_download(url: &str, out_template: &str) -> Result<(), String> {
    let status = Command::new("yt-dlp")
        .args([
            "-f",
            "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/best",
            "-o",
            out_template,
            url,
        ])
        .status()
        .map_err(|_| "yt-dlp is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("yt-dlp could not download that video.".into())
    }
}

pub fn ffmpeg_extract_wav(input: &str, output: &str) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args([
            "-y", "-i", input, "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1", output,
        ])
        .status()
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not extract audio from that file.".into())
    }
}

pub fn ffmpeg_cut_clip(input: &str, start: f64, duration: f64, output: &str) -> Result<(), String> {
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
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not render that clip.".into())
    }
}

pub fn dir_size(path: &std::path::Path) -> u64 {
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
    Ok(strip_html(&html))
}

fn strip_html(html: &str) -> String {
    let no_script = regex::Regex::new(r"(?is)<(script|style)[^>]*>.*?</\1>").unwrap();
    let tags = regex::Regex::new(r"(?is)<[^>]+>").unwrap();
    let ws = regex::Regex::new(r"[ \t]+\n").unwrap();
    let cleaned = no_script.replace_all(html, " ");
    let cleaned = tags.replace_all(&cleaned, " ");
    let cleaned = html_unescape(&cleaned);
    ws.replace_all(&cleaned, "\n")
        .split_whitespace()
        .collect::<Vec<_>>()
        .chunks(24)
        .map(|c| c.join(" "))
        .collect::<Vec<_>>()
        .join("\n")
}

fn html_unescape(s: &str) -> String {
    s.replace("&nbsp;", " ")
        .replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&#39;", "'")
}
