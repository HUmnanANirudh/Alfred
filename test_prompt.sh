#!/bin/bash
TRANSCRIPT=$(cat /tmp/transcript_text.json)
PROMPT=$(cat << EOM
You are a viral video editor. Analyze this transcript and identify the strongest short-form clip moments.

Rules:
- Each clip must capture one complete thought or story arc
- Duration must match the content: 20-90 seconds is acceptable, never cut mid-sentence
- Prioritize: strong hooks, surprising facts, emotional peaks, clear takeaways
- Output ONLY valid JSON, nothing else

Transcript segments (JSON array with start/end in seconds):
$TRANSCRIPT

Output schema:
{"clips":[{"start":0.0,"end":45.2,"hook":"One-line hook for this clip","reason":"Why this is a strong short","hook_score":0.9}]}
EOM
)

# Convert to JSON string safely
JSON_BODY=$(jq -n --arg p "$PROMPT" '{
  "messages": [{"role": "user", "content": $p}],
  "max_tokens": 800,
  "temperature": 0.3,
  "response_format": {"type": "json_object"}
}')

curl -s -X POST http://127.0.0.1:8765/v1/chat/completions -H "Content-Type: application/json" -d "$JSON_BODY"
