fn main() {
    let text = "Graphana. In this video, I'm going to explain what Graphana is, why it exists, and what's the problem it solves: data sources, dashboards, panels, variables, and the three pillars of observability. We will start with the all-way of monitoring and end up with a full Graphana dashboard showing data from multiple sources at the same time. My name is Diego.";
    let end = 60.0;
    let total_chars = text.len() as f64;
    let mut current_start = 0.0;
    let mut chunk = String::new();
    let parts: Vec<&str> = text.split_inclusive(|c| c == '.' || c == '?' || c == '!' || c == '\n').collect();
    
    let mut count = 0;
    for (i, part) in parts.iter().enumerate() {
        chunk.push_str(part);
        if chunk.len() > 150 || i == parts.len() - 1 {
            let duration = (chunk.len() as f64 / total_chars) * end;
            let seg_end = current_start + duration;
            println!("[{:.1} -> {:.1}] {}", current_start, seg_end, chunk.trim());
            current_start = seg_end;
            chunk.clear();
            count += 1;
        }
    }
    println!("Total segments: {}", count);
}
