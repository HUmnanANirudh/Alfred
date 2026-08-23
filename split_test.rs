fn split_text_into_segments(text: &str, total_end: f64) -> Vec<serde_json::Value> {
    let mut segments = Vec::new();
    // Split by punctuation
    let parts: Vec<&str> = text.split_inclusive(|c| c == '.' || c == '?' || c == '!').collect();
    
    let total_chars = text.len() as f64;
    let mut current_start = 0.0;
    
    let mut chunk = String::new();
    
    for (i, part) in parts.iter().enumerate() {
        chunk.push_str(part);
        if chunk.len() > 200 || i == parts.len() - 1 {
            let chunk_chars = chunk.len() as f64;
            let duration = (chunk_chars / total_chars) * total_end;
            let end = current_start + duration;
            
            segments.push(serde_json::json!({
                "id": format!("seg_{i}"),
                "start": current_start,
                "end": end,
                "text": chunk.trim(),
                "index": segments.len()
            }));
            
            current_start = end;
            chunk.clear();
        }
    }
    segments
}
