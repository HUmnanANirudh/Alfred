use std::path::{Path, PathBuf};
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use std::sync::OnceLock;

static SERVER_PORT: OnceLock<u16> = OnceLock::new();

#[allow(dead_code)]
pub fn get_port() -> Option<u16> {
    SERVER_PORT.get().copied()
}

pub fn get_base_url() -> Option<String> {
    SERVER_PORT.get().map(|p| format!("http://127.0.0.1:{p}"))
}

/// Spawn a tiny HTTP file server on a random port.
/// Only serves files under `allowed_root` (the app data dir).
/// Supports HTTP Range requests for video/audio playback.
pub async fn start_file_server(allowed_root: PathBuf) {
    let listener = match TcpListener::bind("127.0.0.1:0").await {
        Ok(l) => l,
        Err(e) => {
            eprintln!("[file-server] Failed to bind: {e}");
            return;
        }
    };
    let port = listener.local_addr().map(|a| a.port()).unwrap_or(0);
    let _ = SERVER_PORT.set(port);
    eprintln!("[file-server] Listening on http://127.0.0.1:{port}");

    loop {
        let (mut stream, _addr) = match listener.accept().await {
            Ok(v) => v,
            Err(_) => continue,
        };
        let root = allowed_root.clone();
        tokio::spawn(async move {
            let mut buf = vec![0u8; 8192];
            let n = match stream.read(&mut buf).await {
                Ok(n) if n > 0 => n,
                _ => return,
            };
            let request = String::from_utf8_lossy(&buf[..n]);

            let first_line = request.lines().next().unwrap_or("");
            let parts: Vec<&str> = first_line.split_whitespace().collect();
            let method = parts.first().copied().unwrap_or("GET");
            let req_path = parts.get(1).copied().unwrap_or("/");

            // Handle OPTIONS (CORS preflight)
            if method == "OPTIONS" {
                let resp = "HTTP/1.1 204 No Content\r\n\
                    Access-Control-Allow-Origin: *\r\n\
                    Access-Control-Allow-Methods: GET, HEAD, OPTIONS\r\n\
                    Access-Control-Allow-Headers: Range\r\n\
                    Access-Control-Max-Age: 86400\r\n\
                    Connection: close\r\n\r\n";
                let _ = stream.write_all(resp.as_bytes()).await;
                return;
            }

            // Handle HEAD
            let is_head = method == "HEAD";

            // Decode percent-encoded path
            let decoded = percent_decode(req_path);
            // If the decoded path is absolute, use it directly; otherwise join with root
            let full = {
                let p = PathBuf::from(&decoded);
                if p.is_absolute() { p } else { root.join(p) }
            };

            // Security: resolve and check it's under allowed_root
            let canonical_allowed = match std::fs::canonicalize(&root) {
                Ok(p) => p,
                Err(_) => {
                    send_error(&mut stream, 500, "cannot resolve root").await;
                    return;
                }
            };
            let canonical_file = match std::fs::canonicalize(&full) {
                Ok(p) => p,
                Err(_) => {
                    send_error(&mut stream, 404, "not found").await;
                    return;
                }
            };

            if !canonical_file.starts_with(&canonical_allowed) || !canonical_file.is_file() {
                send_error(&mut stream, 404, "not found").await;
                return;
            }

            let file_size = match std::fs::metadata(&canonical_file) {
                Ok(m) => m.len(),
                Err(_) => {
                    send_error(&mut stream, 404, "not found").await;
                    return;
                }
            };

            let mime = guess_mime(&canonical_file);

            // Parse Range header if present
            let range_header = request
                .lines()
                .find(|l| l.to_lowercase().starts_with("range:"))
                .and_then(|l| l.split_once(':'))
                .map(|(_, v)| v.trim());

            match range_header {
                Some(range_val) => {
                    // Parse "bytes=start-end" or "bytes=start-"
                    if let Some(range_spec) = range_val.strip_prefix("bytes=") {
                        let (start, end) = parse_range(range_spec, file_size);
                        let len = end - start + 1;

                        if is_head {
                            let header = format!(
                                "HTTP/1.1 206 Partial Content\r\n\
                                 Content-Type: {mime}\r\n\
                                 Content-Length: {len}\r\n\
                                 Content-Range: bytes {start}-{end}/{file_size}\r\n\
                                 Accept-Ranges: bytes\r\n\
                                 Access-Control-Allow-Origin: *\r\n\
                                 Connection: close\r\n\r\n"
                            );
                            let _ = stream.write_all(header.as_bytes()).await;
                        } else {
                            // Read the requested byte range from file
                            match read_range(&canonical_file, start, len).await {
                                Ok(data) => {
                                    let header = format!(
                                        "HTTP/1.1 206 Partial Content\r\n\
                                         Content-Type: {mime}\r\n\
                                         Content-Length: {len}\r\n\
                                         Content-Range: bytes {start}-{end}/{file_size}\r\n\
                                         Accept-Ranges: bytes\r\n\
                                         Access-Control-Allow-Origin: *\r\n\
                                         Connection: close\r\n\r\n"
                                    );
                                    let _ = stream.write_all(header.as_bytes()).await;
                                    let _ = stream.write_all(&data).await;
                                }
                                Err(_) => {
                                    send_error(&mut stream, 500, "read error").await;
                                }
                            }
                        }
                    } else {
                        send_error(&mut stream, 416, "invalid range").await;
                    }
                }
                None => {
                    // No Range header — serve full file
                    if is_head {
                        let header = format!(
                            "HTTP/1.1 200 OK\r\n\
                             Content-Type: {mime}\r\n\
                             Content-Length: {file_size}\r\n\
                             Accept-Ranges: bytes\r\n\
                             Access-Control-Allow-Origin: *\r\n\
                             Connection: close\r\n\r\n"
                        );
                        let _ = stream.write_all(header.as_bytes()).await;
                    } else {
                        match tokio::fs::read(&canonical_file).await {
                            Ok(bytes) => {
                                let header = format!(
                                    "HTTP/1.1 200 OK\r\n\
                                     Content-Type: {mime}\r\n\
                                     Content-Length: {}\r\n\
                                     Accept-Ranges: bytes\r\n\
                                     Access-Control-Allow-Origin: *\r\n\
                                     Connection: close\r\n\r\n",
                                    bytes.len()
                                );
                                let _ = stream.write_all(header.as_bytes()).await;
                                let _ = stream.write_all(&bytes).await;
                            }
                            Err(_) => {
                                send_error(&mut stream, 500, "read error").await;
                            }
                        }
                    }
                }
            }
        });
    }
}

async fn send_error(stream: &mut (impl AsyncWriteExt + Unpin), code: u16, msg: &str) {
    let body = msg.as_bytes();
    let status = match code {
        404 => "404 Not Found",
        416 => "416 Range Not Satisfiable",
        500 => "500 Internal Server Error",
        _ => "500 Internal Server Error",
    };
    let header = format!(
        "HTTP/1.1 {status}\r\n\
         Content-Type: text/plain\r\n\
         Content-Length: {}\r\n\
         Access-Control-Allow-Origin: *\r\n\
         Connection: close\r\n\r\n",
        body.len()
    );
    let _ = stream.write_all(header.as_bytes()).await;
    let _ = stream.write_all(body).await;
}

/// Parse a Range header value like "0-1023" or "500-" into (start, end) inclusive.
fn parse_range(spec: &str, file_size: u64) -> (u64, u64) {
    if let Some((start_s, end_s)) = spec.split_once('-') {
        let start: u64 = start_s.parse().unwrap_or(0);
        let end: u64 = if end_s.is_empty() {
            file_size - 1
        } else {
            end_s.parse().unwrap_or(file_size - 1).min(file_size - 1)
        };
        (start, end)
    } else {
        (0, file_size - 1)
    }
}

/// Read `len` bytes starting at `offset` from a file.
async fn read_range(path: &Path, offset: u64, len: u64) -> std::io::Result<Vec<u8>> {
    let mut file = tokio::fs::File::open(path).await?;
    use tokio::io::AsyncSeekExt;
    file.seek(std::io::SeekFrom::Start(offset)).await?;
    let mut buf = vec![0u8; len as usize];
    file.read_exact(&mut buf).await?;
    Ok(buf)
}

fn guess_mime(path: &Path) -> &'static str {
    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
    match ext.to_lowercase().as_str() {
        "mp4" | "m4v" => "video/mp4",
        "webm" => "video/webm",
        "ogg" | "ogv" => "video/ogg",
        "wav" => "audio/wav",
        "mp3" => "audio/mpeg",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        _ => "application/octet-stream",
    }
}

fn percent_decode(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.bytes();
    while let Some(b) = chars.next() {
        if b == b'%' {
            let hi = chars.next().unwrap_or(b'0');
            let lo = chars.next().unwrap_or(b'0');
            let byte = (hex_val(hi) << 4) | hex_val(lo);
            out.push(byte as char);
        } else if b == b'+' {
            out.push(' ');
        } else {
            out.push(b as char);
        }
    }
    out
}

fn hex_val(b: u8) -> u8 {
    match b {
        b'0'..=b'9' => b - b'0',
        b'a'..=b'f' => b - b'a' + 10,
        b'A'..=b'F' => b - b'A' + 10,
        _ => 0,
    }
}
