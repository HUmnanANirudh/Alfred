# Alfred — Architecture

> **Updated 2026-08-22**: Revised to reflect the all-native AI stack.
> FastAPI/Python sidecar removed. audio.cpp replaces all Python audio tooling.
> Turso noted as optional sync layer; local SQLite/libSQL is the strict offline default.

---

## 1. High-Level Stack

```
┌────────────────────────────────────────────────────────────────────┐
│                         ALFRED DESKTOP APP                         │
│                                                                    │
│  ┌───────────────────────────────────────┐                        │
│  │   FRONTEND  (React + TypeScript)      │  ← UI, routing, state  │
│  │   Vite + Tauri WebView                │                        │
│  └─────────────────┬─────────────────────┘                        │
│                    │  Tauri IPC (invoke / events)                  │
│  ┌─────────────────▼─────────────────────────────────────────┐   │
│  │              RUST CORE  (Tauri Commands)                   │   │
│  │                                                            │   │
│  │   Orchestration · FS · Jobs · Storage · Config             │   │
│  │                                                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐ │   │
│  │  │  llama.cpp   │  │  audio.cpp   │  │  FFmpeg/yt-dlp  │ │   │
│  │  │  (native)    │  │  (native)    │  │  (sidecar bin)  │ │   │
│  │  │              │  │              │  │                 │ │   │
│  │  │ LFM2.5-350M  │  │ Qwen3-ASR    │  │  clip cutting   │ │   │
│  │  │ SmolVLM2     │  │ PocketTTS    │  │  captions       │ │   │
│  │  │              │  │ Chatterbox   │  │  download       │ │   │
│  │  │              │  │ SeedVC/RVC   │  │  resampling     │ │   │
│  │  │              │  │ Silero VAD   │  │                 │ │   │
│  │  │              │  │ Qwen3 Align  │  │                 │ │   │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘ │   │
│  └─────────────────┬─────────────────────────────────────────┘   │
│                    │  libSQL (SQLite-compatible file)              │
│  ┌─────────────────▼─────────────────────┐                        │
│  │   LOCAL DATABASE  (libSQL / SQLite)   │  ← project metadata DB │
│  │   alfred.db — 100% on device          │                        │
│  └───────────────────────────────────────┘                        │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
                        All processing stays on device
                        No Python. No cloud. No sidecar.
```

---

## 2. Technology Stack

### Frontend
| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Framework | React | 19.x | UI rendering |
| Language | TypeScript | ~5.8 | Type safety |
| Bundler | Vite | 7.x | Dev server + build |
| Desktop shell | Tauri | 2.x | Native window, IPC, FS |
| Styling | CSS Modules / design tokens | — | Alfred design system |
| Routing | React Router | 6.x | Workspace navigation |
| State | Zustand | — | Project/app state |
| Package manager | Bun | — | Installs and scripts |

### Backend — Rust Core (the single native layer)
| Component | Technology | Purpose |
|-----------|-----------|---------|
| Desktop shell | Tauri 2 | IPC command handlers, native window |
| Text / Vision AI | llama.cpp (native integration) | LFM2.5-350M + SmolVLM2 inference |
| Audio AI | audio.cpp (native integration) | ASR, TTS, cloning, VAD, alignment, VC |
| Media download | yt-dlp (sidecar binary) | YouTube + URL acquisition |
| Media processing | FFmpeg (sidecar binary) | Clip cutting, captioning, audio rendering |
| Database client | libsql-client-rs | Read/write local SQLite/libSQL DB |
| Serialisation | serde / serde_json | Tauri command payloads |
| Job queue | Tokio async tasks | Async job orchestration |

> **No Python. No FastAPI. No Conda environments. No dependency hell.**
> llama.cpp and audio.cpp are C++ native runtimes managed directly by Rust.
> If a local HTTP interface is needed, both llama.cpp server and audiocpp_server
> expose native HTTP endpoints that Rust can manage as child processes.

### Database — Strict Offline Mode
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Primary engine | libSQL / SQLite-compatible | Local project database |
| Storage model | Single `alfred.db` file | Per-installation, fully local |
| Privacy guarantee | Zero network calls | Nothing ever leaves the device |
| Optional future | Turso Cloud sync | Opt-in only, never default |

> **Turso Cloud is explicitly opt-in and never the default.**
> Alfred's honest privacy claim: "Nothing leaves this device" requires a local-only DB.
> Turso's embedded libSQL driver is used for the local file — not the cloud API.

### AI Engines
See [`10_AI_ENGINE.md`](./10_AI_ENGINE.md) for the full AI architecture.

| Engine | Role | Models |
|--------|------|--------|
| llama.cpp | Text generation + Vision | LFM2.5-350M, SmolVLM2-256M |
| audio.cpp | All audio tasks | Qwen3-ASR, PocketTTS, Chatterbox, SeedVC, Silero VAD, Qwen3-Align |
| FFmpeg | Media processing | — (no model needed) |
| yt-dlp | Media acquisition | — (no model needed) |

---

## 3. Engine Integration Architecture

### llama.cpp integration (Rust)

llama.cpp can be integrated into Rust via:
1. **Native C FFI** — link against llama.cpp's C API directly from Rust (`llama-sys` or similar)
2. **Child process** — spawn `llama-server` or `llama-cli` as a managed child process; Rust talks to it over local HTTP or stdin/stdout

For Alfred, the **child process + local HTTP** approach is preferred in Phase 2 for stability and restartability.

```
Rust orchestrator
      │
      ├── spawns llama-server (localhost:PORT, loaded once)
      │         │
      │         └── LFM2.5-350M-Q4_K_M loaded into VRAM/RAM
      │
      └── sends HTTP POST /completion requests
                │
                └── returns streamed JSON
```

Rust holds the child process handle; if it crashes, Rust restarts it.

### audio.cpp integration (Rust)

audio.cpp exposes:
- `audiocpp_cli` — one-shot CLI invocations
- `audiocpp_server` — persistent server with reusable model sessions (preferred)

For Alfred:

```
Rust orchestrator
      │
      ├── spawns audiocpp_server (localhost:PORT)
      │         │
      │         ├── Model: Qwen3-ASR (loaded on first ASR request)
      │         ├── Model: PocketTTS (loaded on first TTS request)
      │         └── Model: Chatterbox (loaded on first clone request)
      │
      └── sends HTTP POST requests to audiocpp_server
                │
                ├── POST /v1/audio/transcriptions   ← ASR
                ├── POST /v1/audio/speech            ← TTS
                └── POST /v1/tasks/run               ← VC, cloning, VAD, align
```

`lazy_load: true` in audiocpp_server config means models load on first use — Alfred doesn't pay the memory cost for models the user hasn't triggered yet.

---

## 4. Tauri IPC Bridge

Tauri is the seam between the React frontend and the Rust backend.

### How it works
```typescript
// Frontend calls a Rust command via the service layer
import { invoke } from "@tauri-apps/api/core";

// Never called directly — always via service layer:
const result = await invoke<Source>("add_source", {
  projectId: "proj_abc",
  sourceType: "article",
  url: "https://example.com/article",
});
```

```rust
#[tauri::command]
async fn add_source(
    project_id: String,
    source_type: String,
    url: Option<String>,
) -> Result<Source, String> {
    // real implementation calls DB, engines, FS
}
```

### Command naming convention
- Snake_case Rust command names: `create_project`, `add_source`, `generate_short`, `run_asr`
- The frontend service layer wraps all `invoke()` calls — UI components never touch IPC directly

### Events (Rust → Frontend, for job progress)
```rust
// Rust emits as a long-running job makes progress
app.emit("job:progress", JobProgress {
    job_id,
    step_index,
    step_label,
    status,
    message,
}).unwrap();
```
```typescript
// Frontend listens in the service layer
listen("job:progress", (event) => {
    store.updateJob(event.payload as JobProgress);
});
```

---

## 5. Service Layer (the critical seam)

```
React Components
      │
      ▼
┌─────────────────────────┐
│   Service Layer         │  ← Phase 1: returns mocked data
│   projectService        │     Phase 2: calls invoke()
│   sourceService         │
│   videoService          │
│   audioService          │
│   writingService        │
│   voiceService          │
│   transcriptService     │
│   modelService          │
└─────────────┬───────────┘
              │
    ┌─────────▼──────────┐        ┌──────────────────────────────┐
    │  Tauri invoke()    │  ─────▶│  Rust Commands               │
    └────────────────────┘        └────────┬─────────────────────┘
                                           │
                              ┌────────────┼─────────────┐
                              ▼            ▼             ▼
                         llama.cpp    audio.cpp    FFmpeg/yt-dlp
                              │            │
                              └────────────┘
                                     │
                              ┌──────▼──────┐
                              │  libSQL DB  │
                              └─────────────┘
```

**Rule:** React components NEVER call `invoke()` directly. They always call a service function.

---

## 6. Video Pipeline — Full Architecture

The short-generation pipeline uses all three AI engines in concert:

```
VIDEO SOURCE (YouTube / Local file)
        │
        ▼
     yt-dlp
        │
        ▼
   Local video file
        │
   ┌────┴────┐
   ▼         ▼
FFmpeg     FFmpeg
(frames)  (audio)
   │         │
   ▼         ▼
SmolVLM2  audio.cpp
(visual    (ASR →
 scene      Transcript
 analysis)  + Alignment
   │         + VAD)
   │         │
   └────┬────┘
        ▼
  Unified Timeline
  {timestamp, text, visual_description, speaker}
        │
        ▼
  LFM2.5-350M
  (structured JSON prompt)
        │
        ▼
  Clip candidates
  [{ start, end, hook_score, visual_score, speech_score, hook_text }]
        │
        ▼
     FFmpeg
     (cut + caption overlay + layout)
        │
        ▼
   Final Shorts
```

---

## 7. Audio Pipeline

```
Script (manual or LFM2.5-350M generated from sources)
        │
        ▼
  audio.cpp
  audiocpp_server → PocketTTS (or selected TTS family)
        │
        ▼
   Generated audio file (.wav)
        │
        ▼
   (optional) FFmpeg — resampling, format conversion
        │
        ▼
   Stored in project/audio/
```

**Voice cloning path:**
```
Reference audio sample (uploaded by user)
        │
        ▼
  audio.cpp — Chatterbox / Qwen3-TTS / selected clone family
        │
        ├── clone voice profile
        │
        ▼
   Script → TTS with cloned voice
        │
        ▼
   Generated audio file
```

---

## 8. File & Project Storage

```
~/Library/Application Support/alfred/   (macOS)
~/.local/share/alfred/                  (Linux)
%APPDATA%/alfred/                       (Windows)
│
├── alfred.db                           ← libSQL local database (ALL project data)
│
├── engines/                            ← managed native binaries
│   ├── llama-server                    ← llama.cpp server binary
│   ├── audiocpp_server                 ← audio.cpp server binary
│   ├── audiocpp_model_manager          ← audio.cpp model manager
│   ├── ffmpeg                          ← FFmpeg binary
│   └── yt-dlp                          ← yt-dlp binary
│
├── models/                             ← downloaded AI models (GGUF)
│   ├── text/
│   │   ├── lfm2.5-350m-q4_k_m.gguf    ← default text brain
│   │   └── smolvlm2-256m-video.gguf   ← video understanding
│   ├── asr/
│   │   └── qwen3-asr-0.6b-q8.gguf
│   ├── tts/
│   │   └── pocket-tts/
│   ├── voice/
│   │   └── chatterbox/
│   ├── vad/
│   │   └── silero-vad/                 ← bundled, no download needed
│   └── align/
│       └── qwen3-aligner-0.6b-q8.gguf
│
├── projects/
│   └── {project_id}/
│       ├── sources/                    ← raw downloaded/saved source files
│       ├── transcripts/               ← generated transcript JSON files
│       ├── shorts/                    ← rendered short video files
│       ├── audio/                     ← generated audio files
│       ├── frames/                    ← extracted video frames (temp)
│       └── writing/                   ← exported writing drafts
│
└── exports/                           ← user-facing export directory
```

---

## 9. Database Schema (libSQL / SQLite)

> Canonical schema. Phase 1 uses mocked in-memory data with this shape.
> Phase 2 writes to `alfred.db` via the libsql-client-rs driver.

```sql
-- Projects
CREATE TABLE projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Sources
CREATE TABLE sources (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  type        TEXT NOT NULL,  -- 'article' | 'youtube' | 'video' | 'text'
  title       TEXT NOT NULL,
  content     TEXT,
  url         TEXT,
  word_count  INTEGER,
  metadata    TEXT,           -- JSON blob for type-specific data
  created_at  TEXT NOT NULL
);

-- Videos
CREATE TABLE videos (
  id           TEXT PRIMARY KEY,
  project_id   TEXT NOT NULL REFERENCES projects(id),
  source_id    TEXT REFERENCES sources(id),
  title        TEXT NOT NULL,
  duration     INTEGER,       -- seconds
  file_path    TEXT,
  thumbnail    TEXT,
  has_transcript INTEGER DEFAULT 0,
  created_at   TEXT NOT NULL
);

-- Transcripts (first-class AI artifact)
CREATE TABLE transcripts (
  id          TEXT PRIMARY KEY,
  video_id    TEXT NOT NULL REFERENCES videos(id),
  project_id  TEXT NOT NULL REFERENCES projects(id),
  segments    TEXT NOT NULL,  -- JSON array of TranscriptSegment
  language    TEXT,
  engine      TEXT,           -- 'qwen3_asr' | 'nemotron_asr' etc.
  created_at  TEXT NOT NULL
);

-- Clip Candidates (output of LFM2.5 clip analysis)
CREATE TABLE clip_candidates (
  id              TEXT PRIMARY KEY,
  transcript_id   TEXT NOT NULL REFERENCES transcripts(id),
  video_id        TEXT NOT NULL REFERENCES videos(id),
  project_id      TEXT NOT NULL REFERENCES projects(id),
  start_time      REAL NOT NULL,
  end_time        REAL NOT NULL,
  hook_score      REAL,
  visual_score    REAL,
  speech_score    REAL,
  hook_text       TEXT,
  reason          TEXT,
  created_at      TEXT NOT NULL
);

-- Shorts
CREATE TABLE shorts (
  id                TEXT PRIMARY KEY,
  project_id        TEXT NOT NULL REFERENCES projects(id),
  video_id          TEXT REFERENCES videos(id),
  clip_candidate_id TEXT REFERENCES clip_candidates(id),
  preset_id         TEXT NOT NULL,
  title             TEXT,
  duration          INTEGER,
  file_path         TEXT,
  confidence        REAL,
  hook              TEXT,
  captions_enabled  INTEGER DEFAULT 1,
  caption_style     TEXT,
  created_at        TEXT NOT NULL
);

-- Audio
CREATE TABLE audio_generations (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  voice_id    TEXT NOT NULL,
  script      TEXT NOT NULL,
  duration    INTEGER,
  file_path   TEXT,
  engine      TEXT,           -- 'pocket_tts' | 'chatterbox' | etc.
  source_ids  TEXT,           -- JSON array
  created_at  TEXT NOT NULL
);

-- Writing
CREATE TABLE writing_outputs (
  id          TEXT PRIMARY KEY,
  project_id  TEXT NOT NULL REFERENCES projects(id),
  type        TEXT NOT NULL,  -- 'article' | 'x_post' | 'thread' | 'linkedin'
  title       TEXT,
  content     TEXT NOT NULL,
  source_ids  TEXT,           -- JSON array
  model       TEXT,           -- 'lfm2.5-350m' etc.
  created_at  TEXT NOT NULL
);

-- Voices (global, cross-project)
CREATE TABLE voices (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  sample_path TEXT,
  engine      TEXT,           -- 'chatterbox' | 'qwen3_tts' | 'rvc' etc.
  created_at  TEXT NOT NULL
);

-- Jobs (async operation tracking)
CREATE TABLE jobs (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL,  -- 'pending' | 'running' | 'done' | 'error'
  project_id  TEXT,
  payload     TEXT,           -- JSON
  result      TEXT,           -- JSON
  error       TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

-- Installed Models registry
CREATE TABLE installed_models (
  id            TEXT PRIMARY KEY,   -- model package id e.g. 'qwen3_asr_0_6b_q8_0'
  family        TEXT NOT NULL,      -- 'qwen3_asr'
  engine        TEXT NOT NULL,      -- 'audio_cpp' | 'llama_cpp'
  role          TEXT NOT NULL,      -- 'asr' | 'tts' | 'text' | 'vision' | 'vad' | 'align' | 'vc' | 'clone'
  display_name  TEXT NOT NULL,
  file_path     TEXT,
  size_bytes    INTEGER,
  status        TEXT NOT NULL,      -- 'not_installed' | 'downloading' | 'installed' | 'ready'
  is_default    INTEGER DEFAULT 0,
  installed_at  TEXT
);
```

---

## 10. What Phase 1 Touches

Phase 1 is **frontend only**. The following are NOT implemented in Phase 1:

- Real Tauri `invoke()` calls
- Rust command handlers
- llama.cpp integration
- audio.cpp integration
- FFmpeg / yt-dlp
- libSQL database (only mocked in-memory data)
- Any AI model inference

See [`04_PHASE1_SPEC.md`](./04_PHASE1_SPEC.md) for the full Phase 1 scope.
See [`10_AI_ENGINE.md`](./10_AI_ENGINE.md) for the full AI model architecture.

---

*Next: [03_DATA_MODELS.md](./03_DATA_MODELS.md)*
