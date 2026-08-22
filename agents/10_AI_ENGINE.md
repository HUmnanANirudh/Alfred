# Alfred — AI Engine Architecture

> This document is the definitive reference for every AI model and engine used in Alfred.
> Read this before adding, changing, or configuring any model in the product.

---

## 1. The Two Engines

Alfred's AI runs on exactly two native C++ inference engines. No Python. No cloud APIs.

```
                       ALFRED
                          │
            ┌─────────────┴──────────────┐
            │                            │
       llama.cpp                    audio.cpp
            │                            │
    ┌───────┴────────┐        ┌──────────┴───────────────┐
    │                │        │                           │
 LFM2.5-350M    SmolVLM2   ASR/STT                     TTS
 (text brain)   (video     Alignment                 Voice Clone
                 vision)   VAD                       Voice Convert
                           Source Sep                Voice Design
```

| Engine | What it handles | Why chosen |
|--------|----------------|-----------|
| **llama.cpp** | Text generation, video understanding | Mature, GGUF-native, vast model support, excellent CUDA/Metal perf |
| **audio.cpp** | Every audio capability | Built on ggml (same as llama.cpp), native C++, covers TTS/ASR/cloning/VAD/align/VC in one runtime, no Python |

---

## 2. Model Registry (Default Stack)

This is Alfred's locked default model stack. Every model is GGUF, local, on-device.

| Alfred Capability | Engine | Model Family | Default Package | Size | Notes |
|-------------------|--------|-------------|-----------------|------|-------|
| **Text generation** | llama.cpp | LFM2.5 | `LFM2.5-350M-Q4_K_M` | ~200 MB | Default text brain |
| **Video understanding** | llama.cpp | SmolVLM2 | `SmolVLM2-256M-Video-Instruct` | ~175 MB Q8 | Video frame analysis |
| **Speech → text (ASR)** | audio.cpp | `qwen3_asr` | `Qwen3-ASR-0.6B-Q8` | ~600 MB | Primary transcription |
| **Forced word alignment** | audio.cpp | `qwen3_forced_aligner` | `Qwen3-ForcedAligner-0.6B-Q8` | ~600 MB | Word-level timestamps |
| **Voice activity detection** | audio.cpp | `silero_vad` | bundled | ~2 MB | Chunk boundary detection |
| **Text → speech (TTS)** | audio.cpp | `pocket_tts` | `PocketTTS-100M` | ~100 MB | Fast, lightweight default TTS |
| **Voice cloning** | audio.cpp | `chatterbox` | `Chatterbox-Q8` | ~500 MB | Default clone engine |
| **Voice conversion** | audio.cpp | `seed_vc` | `SeedVC-XLS-R` | ~300 MB | Voice-to-voice conversion |

### User-selectable alternatives

Alfred exposes a model registry in Settings. Users can swap to higher-quality (larger) models:

| Role | Alternative Options |
|------|-------------------|
| Text brain | LFM2.5-350M-Q5_K_M, Q8_0, BF16 |
| ASR | Nemotron 3.5 ASR 0.6B, Voxtral-Mini Realtime, Qwen3-ASR-1.7B |
| TTS | Supertonic 3 (fastest, 187x real-time on CUDA), VibeVoice 1.5B, Qwen3-TTS 1.7B, MioTTS 1.7B |
| Voice clone | Qwen3-TTS CustomVoice, IndexTTS-2, DotTTS |
| Voice conversion | RVC, MeanVC2 |

---

## 3. LFM2.5-350M — Alfred's Text Brain

### What it is
- **LiquidAI LFM2.5-350M** — a 350M parameter language model from Liquid AI
- Distributed in GGUF format, fully documented for llama.cpp
- Tiny footprint: Q4_K_M is ~200 MB

### What Alfred uses it for
LFM2.5 is given **narrow, structured tasks** — not open-ended chat. Alfred prompts it with structured JSON contracts:

| Task | Input | Output |
|------|-------|--------|
| Clip selection | Transcript + visual observations + preferences | JSON clip candidates with scores |
| Hook generation | Transcript segment | Hook text |
| Article drafting | Source summaries + brief | Markdown article |
| X post / thread | Source summaries + style | JSON posts array |
| LinkedIn post | Source summary + tone | Post text |
| Source summarisation | Raw source content | Structured summary |
| Content brief | Project sources | Brief JSON |
| Title generation | Content | Title options |
| Script generation | Project sources + brief | Audio script |

### Prompt discipline
```
TASK: SELECT_CLIPS
FORMAT: JSON only — no prose, no explanation outside the JSON object

Input:
{
  "transcript_segments": [...],
  "visual_observations": [...],
  "target_count": 5,
  "preferences": { "style": "educational", "hook_type": "contrarian" }
}

Output schema:
{
  "clips": [
    {
      "start": 120.4,
      "end": 143.8,
      "hook_score": 0.91,
      "visual_score": 0.84,
      "hook": "Most creators are using AI backwards.",
      "reason": "Strong contrarian opening backed by specific claim at 2:03"
    }
  ]
}
```

**Critical rule:** Always validate LFM2.5 JSON output against the schema before using it. The model is small — it may occasionally produce malformed JSON. Rust should retry on parse failure (max 2 retries).

### llama.cpp integration mode

Alfred runs llama.cpp as a **persistent child process** (`llama-server` mode):

```
Rust spawns: llama-server --model lfm2.5-350m-q4_k_m.gguf --port 8765 --ctx-size 4096
Rust calls: POST http://localhost:8765/completion (on demand)
```

- The model loads once at startup (or on first use with lazy loading)
- Rust keeps the child process alive and restarts it if it crashes
- SmolVLM2 can run in the same llama-server instance (multi-modal)

---

## 4. SmolVLM2-256M — Video Understanding Specialist

### What it is
- **SmolVLM2-256M-Video-Instruct** — a 256M vision-language model from Hugging Face
- Handles video frames natively — understands visual context, not just text
- Q8_0 GGUF is ~175 MB; F16 is ~328 MB
- Runs via llama.cpp's multi-modal path (same engine as LFM2.5)

### What Alfred uses it for
SmolVLM2 bridges the gap between the audio transcript and the visual content of the video. Without it, Alfred can only understand *what was said*. With it, Alfred understands *what was happening*.

| Task | Input | Output |
|------|-------|--------|
| Scene analysis | Video frame sequence | Visual description per segment |
| Speaker detection | Frames with faces | Speaker present / not present |
| Energy scoring | Frames | Visual energy score for segment |
| Context for clips | Frames at candidate timestamps | "Speaker gesturing emphatically at whiteboard" |

### Video frame extraction

FFmpeg extracts frames before SmolVLM2 runs:

```
FFmpeg --ss {timestamp} -vframes 1 -q:v 2 output_{timestamp}.jpg
```

Alfred extracts one frame per transcript segment (or per 2 seconds for dense video). Frames are stored temporarily in `projects/{id}/frames/` and deleted after analysis.

### Combined timeline output

After ASR and SmolVLM2 analysis, Alfred builds a unified timeline passed to LFM2.5:

```json
[
  {
    "start": 120.4,
    "end": 143.8,
    "text": "Most creators are using AI backwards. Here's what I mean...",
    "speaker": "Speaker 1",
    "visual": "Presenter facing camera directly, leaning forward, emphatic gesture",
    "visual_score": 0.86
  }
]
```

---

## 5. audio.cpp — Alfred's Audio Infrastructure

### What it is
- **audio.cpp** — a high-performance C++ audio inference framework built on ggml
- Covers TTS, voice cloning, voice conversion, ASR, diarization, VAD, source separation, forced alignment, and more
- Native binaries: `audiocpp_cli` (one-shot) and `audiocpp_server` (persistent sessions)
- 50+ model families, 70+ model variants
- GGUF-native: same format as llama.cpp
- Backends: CUDA, HIP/ROCm, Vulkan, Metal, CPU

### Why audio.cpp instead of Python
| Old approach (Python stack) | audio.cpp approach |
|---------------------------|-------------------|
| Whisper Python | Qwen3-ASR via audio.cpp — 1/4 wall time vs Python |
| TTS Python | PocketTTS — 3.68x faster, 47x real-time on CUDA |
| Voice clone Python | Chatterbox via audio.cpp |
| VAD Python | Silero VAD — bundled, no download |
| 5+ Conda environments | One binary |
| Hundreds of packages | Zero Python dependencies |

### Alfred's audio.cpp server config

```json
{
  "host": "127.0.0.1",
  "port": 8766,
  "backend": "cuda",
  "lazy_load": true,
  "models": [
    {
      "id": "asr",
      "family": "qwen3_asr",
      "path": "models/asr/qwen3-asr-0.6b-q8.gguf",
      "task": "asr",
      "mode": "offline"
    },
    {
      "id": "aligner",
      "family": "qwen3_forced_aligner",
      "path": "models/align/qwen3-aligner-0.6b-q8.gguf",
      "task": "align",
      "mode": "offline"
    },
    {
      "id": "tts",
      "family": "pocket_tts",
      "path": "models/tts/pocket-tts",
      "task": "tts",
      "mode": "offline",
      "load_options": { "language": "english" }
    },
    {
      "id": "clone",
      "family": "chatterbox",
      "path": "models/voice/chatterbox",
      "task": "clon",
      "mode": "offline"
    },
    {
      "id": "vad",
      "family": "silero_vad",
      "task": "vad",
      "mode": "offline"
    }
  ]
}
```

### audio.cpp model capabilities mapped to Alfred features

| Alfred Feature | audio.cpp Task | Model Family | Mode |
|---------------|---------------|-------------|------|
| Transcribe video | `asr` | `qwen3_asr` | offline / streaming |
| Word-level timestamps | `align` | `qwen3_forced_aligner` | offline |
| Detect speech boundaries | `vad` | `silero_vad` | bundled |
| Generate voice audio | `tts` | `pocket_tts` | offline |
| Clone user voice | `clon` | `chatterbox` | offline |
| Convert voice | `vc` | `seed_vc` | offline |
| Speaker diarization | `diar` | `sortformer_diar` | offline (Phase 3) |
| Source separation | `sep` | `htdemucs` | offline (Phase 3) |

---

## 6. Full Capability Map

```
Alfred Capability          Engine          Model
─────────────────────────────────────────────────────────────────
Text generation          llama.cpp       LFM2.5-350M-Q4_K_M
Source summarisation     llama.cpp       LFM2.5-350M-Q4_K_M
Clip scoring             llama.cpp       LFM2.5-350M-Q4_K_M
Article writing          llama.cpp       LFM2.5-350M-Q4_K_M
X / Thread / LinkedIn    llama.cpp       LFM2.5-350M-Q4_K_M
Hook generation          llama.cpp       LFM2.5-350M-Q4_K_M
Script generation        llama.cpp       LFM2.5-350M-Q4_K_M
─────────────────────────────────────────────────────────────────
Video frame analysis     llama.cpp       SmolVLM2-256M
Visual scene scoring     llama.cpp       SmolVLM2-256M
─────────────────────────────────────────────────────────────────
Speech → text (ASR)      audio.cpp       Qwen3-ASR-0.6B-Q8
Word alignment           audio.cpp       Qwen3-ForcedAligner-0.6B
Voice activity detection audio.cpp       Silero VAD (bundled)
Text → speech (TTS)      audio.cpp       PocketTTS-100M
Voice cloning            audio.cpp       Chatterbox-Q8
Voice conversion         audio.cpp       SeedVC
─────────────────────────────────────────────────────────────────
Video acquisition        yt-dlp          —
Video/audio processing   FFmpeg          —
─────────────────────────────────────────────────────────────────
Orchestration            Rust (Tauri)    —
UI                       React + Tauri   —
Database                 libSQL/SQLite   —
─────────────────────────────────────────────────────────────────
```

---

## 7. Performance Reference

> Source: audio.cpp project benchmarks on RTX 5090 (CUDA). Alfred targets these as Phase 2 goals.

### TTS speed (real-time factor on CUDA)

| Model | x faster than real time | vs Python |
|-------|------------------------|-----------|
| Supertonic 3 | 187x | — |
| PocketTTS | 48x (long-form) | 3.68x faster |
| MOSS TTS Nano | 9x | — |
| VibeVoice 1.5B | 4x | 1.40x faster |
| Qwen3-TTS | 2.5x | 1.83x faster |

### ASR quality

> Nemotron 3.5 ASR matched Python WER on messy French meeting audio while using ~1/4 wall time (TranscrIA benchmark).
> Qwen3-ASR-0.6B is comparable for standard use cases.

### GGUF quantization impact (Q8 vs F16)

| Model | VRAM reduction | Speed change |
|-------|---------------|-------------|
| Higgs Audio | ~37% less VRAM | 1.53x faster |
| Fish Audio | ~37% less VRAM | — |
| Voxtral | ~37% less VRAM | — |

For Alfred's default PocketTTS (100M model), even F16 is lightweight enough that Q8 may not be necessary.

---

## 8. Hardware Targets

Alfred's AI stack must work across consumer hardware. Targets in priority order:

| Tier | Hardware | Engine path | Expected experience |
|------|----------|-------------|-------------------|
| 1 (ideal) | NVIDIA RTX 30/40/50 series | CUDA | Fast inference, realtime TTS |
| 2 | Apple M1/M2/M3/M4 | Metal (llama.cpp + audio.cpp) | Good performance |
| 3 | AMD RX 6000/7000 | HIP/ROCm | Good, community-supported |
| 4 | Intel/AMD CPU only | CPU (GGML) | Slower but functional |

**Minimum viable hardware:** Any machine with 8 GB RAM and 4 CPU cores can run the Q4_K_M text model and smaller audio models (PocketTTS, Silero VAD) with acceptable performance.

---

## 9. Model Download & Management

audio.cpp ships `audiocpp_model_manager` — a native binary (no Python required):

```bash
# List available packages
audiocpp_model_manager list

# Install a specific package
audiocpp_model_manager install qwen3_asr_0_6b_q8_0 --models-dir models/asr

# Remove a model
audiocpp_model_manager remove qwen3_asr_0_6b_q8_0
```

Alfred's Settings → AI Models screen drives this binary under the hood via Tauri commands.

llama.cpp models (LFM2.5, SmolVLM2) are downloaded from Hugging Face GGUF repositories via Rust's HTTP client (no Python, no HF CLI needed).

### Model download flow (Phase 2)
```
User clicks "Install" on a model in Settings
      │
      ▼
Tauri command: install_model(model_id, engine)
      │
      ├── if engine == "audio_cpp":
      │       spawn audiocpp_model_manager install {model_id}
      │       stream progress events → frontend
      │
      └── if engine == "llama_cpp":
              Rust HTTP download from HF
              stream progress events → frontend
```

---

## 10. Privacy Guarantee

All AI inference is fully local. Alfred makes zero outbound AI requests.

| Data | Leaves device? | Notes |
|------|---------------|-------|
| Video content | ❌ Never | Processed by FFmpeg + SmolVLM2 locally |
| Transcripts | ❌ Never | Qwen3-ASR runs locally |
| Voice samples | ❌ Never | Chatterbox cloning runs locally |
| Generated text | ❌ Never | LFM2.5 runs locally |
| Generated audio | ❌ Never | PocketTTS runs locally |
| Model weights | Downloaded once, then local | GGUF files stored in `models/` |

The only outbound requests Alfred makes:
1. **Model downloads** (one-time, user-initiated, no content sent)
2. **Article URL fetching** (user-initiated, URL only, no content sent to any AI)

---

*Return to: [00_INDEX.md](./00_INDEX.md) | Next: [04_PHASE1_SPEC.md](./04_PHASE1_SPEC.md)*
