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

#[allow(dead_code)]
pub async fn audio_tts(script: &str, out_path: &str) -> Result<(), String> {
    audio_tts_with(script, out_path, None, None).await
}

pub async fn audio_tts_with(
    script: &str,
    out_path: &str,
    voice: Option<&str>,
    reference: Option<&str>,
) -> Result<(), String> {
    let client = reqwest::Client::new();
    let res = if let Some(ref_path) = reference.filter(|p| !p.is_empty() && Path::new(p).exists()) {
        let bytes = tokio::fs::read(ref_path).await.map_err(|e| e.to_string())?;
        let part = reqwest::multipart::Part::bytes(bytes)
            .file_name("voice.wav")
            .mime_str("audio/wav")
            .map_err(|e| e.to_string())?;
        let mut form = reqwest::multipart::Form::new()
            .part("file", part)
            .text("input", script.to_string())
            .text("model", "tts".to_string());
        if let Some(v) = voice {
            form = form.text("voice", v.to_string());
        }
        client
            .post(format!("{AUDIO}/v1/audio/speech"))
            .timeout(Duration::from_secs(180))
            .multipart(form)
            .send()
            .await
    } else {
        let mut body = json!({ "input": script, "model": "tts" });
        if let Some(v) = voice {
            body["voice"] = json!(v);
        }
        client
            .post(format!("{AUDIO}/v1/audio/speech"))
            .timeout(Duration::from_secs(180))
            .json(&body)
            .send()
            .await
    }
    .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    if !res.status().is_success() {
        return Err(format!("TTS failed: {}", res.status()));
    }
    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    tokio::fs::write(out_path, bytes)
        .await
        .map_err(|e| e.to_string())
}

pub async fn audio_task(task: &str, file_path: &str) -> Result<Value, String> {
    let bytes = tokio::fs::read(file_path).await.map_err(|e| e.to_string())?;
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("task", task.to_string());
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/tasks/run"))
        .timeout(Duration::from_secs(300))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    if !res.status().is_success() {
        return Err(format!(
            "audio.cpp could not run {task} ({})",
            res.status()
        ));
    }
    let bytes = res.bytes().await.map_err(|e| e.to_string())?;
    if let Ok(v) = serde_json::from_slice::<Value>(&bytes) {
        return Ok(v);
    }
    Ok(json!({ "binary": true, "bytes": bytes.len() }))
}

pub async fn audio_task_bytes(task: &str, file_path: &str, out_path: &str) -> Result<(), String> {
    let bytes = tokio::fs::read(file_path).await.map_err(|e| e.to_string())?;
    let part = reqwest::multipart::Part::bytes(bytes)
        .file_name("audio.wav")
        .mime_str("audio/wav")
        .map_err(|e| e.to_string())?;
    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("task", task.to_string());
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/tasks/run"))
        .timeout(Duration::from_secs(300))
        .multipart(form)
        .send()
        .await
        .map_err(|e| format!("audio.cpp is not reachable on :8766 ({e})"))?;
    if !res.status().is_success() {
        return Err(format!(
            "audio.cpp could not run {task} ({})",
            res.status()
        ));
    }
    let out = res.bytes().await.map_err(|e| e.to_string())?;
    tokio::fs::write(out_path, out)
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
        .text("model", "qwen3-asr")
        .text("response_format", "verbose_json");
    let client = reqwest::Client::new();
    let res = client
        .post(format!("{AUDIO}/v1/audio/transcriptions"))
        .timeout(Duration::from_secs(900))
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
                "speaker": seg.get("speaker").and_then(|v| v.as_str()),
                "words": seg.get("words").cloned(),
                "confidence": seg.get("avg_logprob").and_then(|v| v.as_f64()).map(|n| (n + 1.0).clamp(0.0, 1.0)).unwrap_or(0.9),
                "index": i
            })
        })
        .filter(|s| s.get("text").and_then(|v| v.as_str()).is_some_and(|t| !t.is_empty()))
        .collect()
}

pub async fn ytdlp_info(url: &str) -> Result<Value, String> {
    let output = Command::new("yt-dlp")
        .args(["-j", "--no-download", "--no-warnings", "--no-playlist", "--no-check-certificates", url])
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
            "--no-playlist",
            "--no-check-certificates",
            "-f",
            "bv*[vcodec^=avc]+ba[ext=m4a]/b[ext=mp4]/best",
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

#[allow(dead_code)]
pub async fn ffmpeg_cut_clip(input: &str, start: f64, duration: f64, output: &str) -> Result<(), String> {
    ffmpeg_cut_clip_layered(input, None, start, duration, output).await
}

pub async fn ffmpeg_cut_clip_layered(
    input: &str,
    broll: Option<&str>,
    start: f64,
    duration: f64,
    output: &str,
) -> Result<(), String> {
    let start_s = format!("{start:.2}");
    let dur_s = format!("{duration:.2}");
    let mut cmd = Command::new("ffmpeg");
    cmd.arg("-y").arg("-ss").arg(&start_s).arg("-t").arg(&dur_s).arg("-i").arg(input);
    if let Some(bg) = broll.filter(|p| !p.is_empty() && Path::new(p).exists()) {
        cmd.args(["-stream_loop", "-1", "-i", bg, "-t", &dur_s]);
        cmd.args([
            "-filter_complex",
            "[1:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920[bg];[0:v]scale=1080:-2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-map",
            "0:a?",
            "-shortest",
            "-movflags",
            "+faststart",
            output,
        ]);
    } else {
        cmd.args([
            "-vf",
            "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920",
            "-c:v",
            "libx264",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
            output,
        ]);
    }
    let status = cmd
        .status()
        .await
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not render that clip.".into())
    }
}

pub async fn ffmpeg_to_mp3(input: &str, output: &str) -> Result<(), String> {
    let status = Command::new("ffmpeg")
        .args(["-y", "-i", input, "-codec:a", "libmp3lame", "-q:a", "2", output])
        .status()
        .await
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not encode MP3.".into())
    }
}

pub async fn ffmpeg_concat_wav(paths: &[String], output: &str) -> Result<(), String> {
    let list = format!("{output}.txt");
    let body = paths
        .iter()
        .map(|p| format!("file '{}'", p.replace('\'', "'\\''")))
        .collect::<Vec<_>>()
        .join("\n");
    tokio::fs::write(&list, body).await.map_err(|e| e.to_string())?;
    let status = Command::new("ffmpeg")
        .args(["-y", "-f", "concat", "-safe", "0", "-i", &list, "-c", "copy", output])
        .status()
        .await
        .map_err(|_| "FFmpeg is not installed on this machine.".to_string())?;
    let _ = tokio::fs::remove_file(&list).await;
    if status.success() {
        Ok(())
    } else {
        Err("FFmpeg could not join those takes.".into())
    }
}

pub fn copy_export(src: &str, dest: &Path) -> Result<String, String> {
    if let Some(parent) = dest.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::copy(src, dest).map_err(|e| e.to_string())?;
    Ok(dest.to_string_lossy().into_owned())
}

pub fn extract_pdf(path: &str) -> Result<String, String> {
    let bytes = std::fs::read(path).map_err(|e| e.to_string())?;
    pdf_extract::extract_text_from_mem(&bytes).map_err(|e| e.to_string())
}

pub fn extract_epub(path: &str) -> Result<String, String> {
    let file = std::fs::File::open(path).map_err(|e| e.to_string())?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;
    let mut chunks = Vec::new();
    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| e.to_string())?;
        let name = entry.name().to_lowercase();
        if !(name.ends_with(".html") || name.ends_with(".xhtml") || name.ends_with(".htm")) {
            continue;
        }
        let mut html = String::new();
        use std::io::Read;
        entry.read_to_string(&mut html).map_err(|e| e.to_string())?;
        let doc = scraper::Html::parse_document(&html);
        if let Ok(sel) = scraper::Selector::parse("body") {
            if let Some(body) = doc.select(&sel).next() {
                let text = body.text().collect::<Vec<_>>().join(" ");
                let norm = text.split_whitespace().collect::<Vec<_>>().join(" ");
                if !norm.is_empty() {
                    chunks.push(norm);
                }
            }
        }
    }
    if chunks.is_empty() {
        return Err("That EPUB has no readable text.".into());
    }
    Ok(chunks.join("\n\n"))
}

pub fn parse_feed(xml: &str, feed_url: &str) -> Vec<(String, String, String)> {
    let mut items = Vec::new();
    let blocks: Vec<&str> = if xml.contains("<item") {
        xml.split("<item").skip(1).collect()
    } else {
        xml.split("<entry").skip(1).collect()
    };
    for block in blocks.iter().take(20) {
        let title = tag_text(block, "title").unwrap_or_else(|| "Feed item".into());
        let link = tag_text(block, "link")
            .or_else(|| attr_href(block))
            .unwrap_or_else(|| feed_url.to_string());
        let body = tag_text(block, "content:encoded")
            .or_else(|| tag_text(block, "description"))
            .or_else(|| tag_text(block, "summary"))
            .or_else(|| tag_text(block, "content"))
            .unwrap_or_default();
        let text = strip_tags(&body);
        if text.split_whitespace().count() > 8 {
            items.push((title, text, link));
        }
    }
    items
}

fn tag_text(hay: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let close = format!("</{tag}>");
    let start = hay.find(&open)?;
    let after = hay[start..].find('>')? + start + 1;
    let end = hay[after..].find(&close)? + after;
    Some(hay[after..end].trim().to_string())
}

fn attr_href(hay: &str) -> Option<String> {
    let idx = hay.find("href=\"")?;
    let rest = &hay[idx + 6..];
    let end = rest.find('"')?;
    Some(rest[..end].to_string())
}

fn strip_tags(s: &str) -> String {
    let mut out = String::new();
    let mut in_tag = false;
    for c in s.chars() {
        match c {
            '<' => in_tag = true,
            '>' => in_tag = false,
            _ if !in_tag => out.push(c),
            _ => {}
        }
    }
    out.split_whitespace().collect::<Vec<_>>().join(" ")
}

pub async fn fetch_url_raw(url: &str) -> Result<String, String> {
    let client = reqwest::Client::builder()
        .user_agent("Alfred/0.1 (local research)")
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;
    client
        .get(url)
        .send()
        .await
        .map_err(|_| "network_error".to_string())?
        .text()
        .await
        .map_err(|_| "network_error".to_string())
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
/// Try to start audio.cpp if it is not already running.
/// Called on-demand before transcription so the user doesn't have to manually start it.
pub async fn try_start_audio() -> Result<(), String> {
    if audio_up().await {
        return Ok(());
    }
    let tools = tooling().await;
    if !tools.audiocpp_server {
        return Err("audio.cpp (audiocpp_server) is not installed on this machine. Install it and add it to PATH.".into());
    }
    let mut cmd = Command::new("audiocpp_server");
    let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
    cmd.args(["--host", "127.0.0.1", "--port", "8766", "--threads", &cores.to_string()]);
    let default_config = std::env::var("HOME").unwrap_or_default() + "/.local/share/audiocpp_server.json";
    if let Ok(config) = std::env::var("ALFRED_AUDIO_CONFIG") {
        cmd.args(["--config", &config]);
    } else if std::path::Path::new(&default_config).exists() {
        cmd.args(["--config", &default_config]);
    }
    cmd.kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start audiocpp_server: {e}"))?;
    // Give it time to bind to the port
    tokio::time::sleep(Duration::from_secs(2)).await;
    if audio_up().await {
        Ok(())
    } else {
        Err("audiocpp_server started but is not responding on port 8766. Check its logs.".into())
    }
}

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
        let cores = std::thread::available_parallelism().map(|n| n.get()).unwrap_or(4);
        cmd.args(["--host", "127.0.0.1", "--port", "8766", "--threads", &cores.to_string()]);
        let default_config = std::env::var("HOME").unwrap_or_default() + "/.local/share/audiocpp_server.json";
        if let Ok(config) = std::env::var("ALFRED_AUDIO_CONFIG") {
            cmd.args(["--config", &config]);
        } else if std::path::Path::new(&default_config).exists() {
            cmd.args(["--config", &default_config]);
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
