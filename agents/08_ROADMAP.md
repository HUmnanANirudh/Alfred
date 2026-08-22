# Alfred — Roadmap

> Phases are sequential. Each phase builds on the last.
> A phase is not complete until its Definition of Done is fully met.
> **Architecture lock:** No Python, no FastAPI, no cloud AI. Native C++ engines only.

---

## Phase Overview

```
Phase 1  ─── Frontend MVP (current)
Phase 2  ─── Native AI Core (llama.cpp + audio.cpp + FFmpeg + Rust)
Phase 3  ─── Advanced Audio, Vision, and Editing
Phase 4  ─── Polish, Packaging, Distribution
```

---

## Phase 1 — Frontend MVP

**Goal:** A fully demo-able desktop frontend with no backend dependency.

**Status:** 🔵 In Progress

### Milestone Checklist

#### App Shell
- [ ] Empty workspace screen ("Alfred, welcomes you")
- [ ] Commission a Project modal
- [ ] Project workspace layout (sidebar + main content)
- [ ] Project switcher in sidebar
- [ ] Command palette (Cmd+K)
- [ ] Keyboard shortcuts wired
- [ ] Status bar with `● Local` indicator
- [ ] Toast notification system
- [ ] Settings screen (mocked — shows model registry with mock status)
- [ ] Voices screen (mocked)

#### Sources
- [ ] Sources list page
- [ ] Add Source modal (type picker: article / youtube / local / paste)
- [ ] Article URL fetch flow (mock + 20% failure + paste fallback)
- [ ] YouTube source flow (mock metadata)
- [ ] Paste text source flow
- [ ] Source detail page
- [ ] Source selector component (reusable across all generation workflows)
- [ ] Source search / filter by type

#### Video
- [ ] Video list page
- [ ] Create Short flow: source → preset → config → processing → result
- [ ] Preset selection screen (visual preset cards)
- [ ] Multi-step processing UI (step list with progress states)
- [ ] Generated shorts list (with hook, confidence, duration)
- [ ] Transcript viewer (timestamped segments)

#### Audio
- [ ] Audio generation page
- [ ] Voice selection modal (3 mock voices: Alex, Sarah, James)
- [ ] Multi-step processing UI
- [ ] Generated audio result card (with waveform placeholder)

#### Writing
- [ ] Article generation + basic editor
- [ ] X post generation + editable post cards
- [ ] Thread generation + editable cards
- [ ] LinkedIn generation + editor

#### Design & Quality
- [ ] Alfred design system tokens (CSS custom properties)
- [ ] All empty states implemented (every section)
- [ ] All loading states (every async operation)
- [ ] All error states with human-readable messages + recovery actions
- [ ] `EngineStatus` UI type present in schema (mock: always "ready")

### Definition of Done — Phase 1
> A user launches Alfred and walks the complete demo flow from `04_PHASE1_SPEC.md §2` without any backend running. Every button does something. No blank screens. No broken navigation. All generated content stays associated with its project.

---

## Phase 2 — Native AI Core

**Goal:** Replace every mock service with real Tauri+Rust commands backed by llama.cpp, audio.cpp, FFmpeg, yt-dlp, and libSQL. No Python. No cloud.

**Estimated start:** After Phase 1 DoD confirmed.

### Engine Setup

#### Rust / Tauri
- [ ] All Phase 1 service interfaces implemented as `#[tauri::command]` handlers
- [ ] Tauri IPC wired: all `delay()` mocks replaced by real `invoke()`
- [ ] File system: project dirs, model dirs, export dir (Tauri FS API)
- [ ] Child process management: llama-server, audiocpp_server (spawn, monitor, restart)
- [ ] yt-dlp sidecar: YouTube video download
- [ ] FFmpeg sidecar: video frame extraction, audio separation, clip rendering, caption overlay

#### Database (libSQL)
- [ ] libsql-client-rs configured with local `alfred.db`
- [ ] CRUD: Projects, Sources, Videos, Transcripts, ClipCandidates, Shorts, AudioGenerations, WritingOutputs, Voices
- [ ] `installed_models` table populated from engine model managers
- [ ] Jobs table with progress event emission

#### llama.cpp — Text Brain (LFM2.5-350M)
- [ ] llama-server launched and managed by Rust
- [ ] `LFM2.5-350M-Q4_K_M` downloaded and loaded
- [ ] Structured JSON prompt → article generation
- [ ] Structured JSON prompt → X post / thread / LinkedIn generation
- [ ] Structured JSON prompt → clip candidate selection
- [ ] Structured JSON prompt → hook generation
- [ ] JSON output validation + 2-retry fallback on malformed output
- [ ] Source summarisation for project context injection

#### llama.cpp — Video Vision (SmolVLM2-256M)
- [ ] `SmolVLM2-256M-Video-Instruct` loaded via llama.cpp multi-modal
- [ ] FFmpeg frame extraction pipeline (1 frame/segment → temp frames dir)
- [ ] Visual scene analysis per segment → `visual_score` + description
- [ ] Unified timeline assembly (ASR text + visual observations)
- [ ] Frame cleanup after analysis

#### audio.cpp — Audio Infrastructure
- [ ] audiocpp_server launched and managed by Rust
- [ ] `qwen3_asr_0_6b_q8_0` installed → transcription endpoint live
- [ ] `qwen3_forced_aligner_0_6b_q8` installed → word alignment endpoint live
- [ ] `silero_vad` (bundled) → VAD endpoint live
- [ ] `pocket_tts` installed → TTS endpoint live
- [ ] `chatterbox_q8` installed → voice cloning endpoint live
- [ ] `seed_vc` installed → voice conversion endpoint live
- [ ] `audiocpp_model_manager` binary managed by Tauri for model downloads

#### Model Management UI (Settings)
- [ ] Real model list from `installed_models` DB table
- [ ] Install / uninstall models via `audiocpp_model_manager` + Rust HTTP download
- [ ] Download progress events → UI
- [ ] Engine status live indicator (`llama-server` / `audiocpp_server` health)
- [ ] Storage usage: real FS measurement

### Definition of Done — Phase 2
> A user can add a real YouTube URL (downloaded via yt-dlp), transcribe it locally with Qwen3-ASR, extract video frames for SmolVLM2 visual analysis, have LFM2.5 select the best clips, render a real short with FFmpeg captions, and generate a real article from project sources — with zero cloud API calls and zero Python dependencies.

---

## Phase 3 — Advanced Audio, Vision & Editing

**Goal:** Voice cloning that wows, richer transcript tools, deeper video pipeline.

### Key Deliverables
- [ ] Speaker diarization (audio.cpp Sortformer-4spk) — "who said what"
- [ ] Source separation (audio.cpp HTDemucs) — music/vocals split
- [ ] Word-level transcript editor / correction UI
- [ ] In-editor AI actions: rewrite, expand, shorten, change tone (LFM2.5)
- [ ] B-roll / background video layer in shorts (FFmpeg composite)
- [ ] Podcast episode format: multi-speaker dialogue audio (audio.cpp VibeVoice / PersonaPlex)
- [ ] Custom video preset builder (user-defined FFmpeg layouts)
- [ ] Export manager (short → .mp4, audio → .wav/.mp3, article → .md/.txt)
- [ ] PDF and EPUB source import (Rust pdf parser)
- [ ] RSS feed source import
- [ ] Advanced ASR: larger Qwen3-ASR-1.7B or Nemotron 3.5 option
- [ ] Streaming TTS preview (real-time audio while typing script)
- [ ] Alternative TTS model option: Supertonic 3 (187x real-time on CUDA)

### Definition of Done — Phase 3
> Alfred can clone a user's voice from a 30-second sample, diarize a multi-speaker podcast, select clips with visual + speech + hook scores, and generate a full multi-speaker podcast episode from project sources — entirely on device.

---

## Phase 4 — Polish, Packaging & Distribution

**Goal:** Production-grade app ready for public release.

### Key Deliverables
- [ ] Auto-updater (Tauri updater plugin)
- [ ] Installer packaging: macOS `.dmg`, Windows `.msi`, Linux `.AppImage` / `.deb`
- [ ] First-launch onboarding: model download guide, hardware detection
- [ ] Performance profiling: model load times, memory usage, VRAM tracking
- [ ] Accessibility audit (keyboard navigation, focus states, screen reader)
- [ ] Crash reporting (local log file, zero telemetry)
- [ ] Documentation site (separate from app)
- [ ] Optional: Turso Cloud sync as an explicit user opt-in (private backup, not default)

---

## Out of Scope (All Phases)

| Feature | Reason |
|---------|--------|
| FastAPI / Python sidecar | Removed from architecture — audio.cpp + llama.cpp handle everything |
| Python audio stack | Removed — audio.cpp is the native replacement |
| Cloud AI APIs (OpenAI, Anthropic, etc.) | Violates privacy-first principle |
| User accounts / authentication | Local app |
| Real-time collaboration | Not in product vision |
| Mobile app | Desktop only |
| Turso Cloud as primary/default DB | Privacy: nothing leaves device by default |
| In-app payments / subscriptions | Separate concern |

---

*Next: [09_DEV_GUIDE.md](./09_DEV_GUIDE.md)*
