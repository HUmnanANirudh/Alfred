# Alfred — Agents Knowledge Hub

> **This folder is the single source of truth for every agent, developer, and collaborator working on Alfred.**
> Read every document in order before touching the codebase.

---

## Document Index

| # | File | What It Covers |
|---|------|----------------|
| 00 | `00_INDEX.md` *(this file)* | Map of the entire knowledge hub |
| 01 | `01_PRODUCT_OVERVIEW.md` | What Alfred is, product philosophy, north-star vision |
| 02 | `02_ARCHITECTURE.md` | Full-stack architecture, native engines, IPC bridge, data flow, DB schema |
| 03 | `03_DATA_MODELS.md` | Canonical TypeScript types — all entities, LFM2.5 output schemas |
| 04 | `04_PHASE1_SPEC.md` | Complete Phase 1 frontend-MVP specification |
| 05 | `05_DESIGN_SYSTEM.md` | Visual language, tokens, component patterns |
| 06 | `06_SERVICES_LAYER.md` | Mock → real service contract, every service API |
| 07 | `07_FEATURE_MAP.md` | Full feature breakdown across all phases |
| 08 | `08_ROADMAP.md` | Phase 1 → 4 milestones and done criteria |
| 09 | `09_DEV_GUIDE.md` | Local setup, commands, conventions, DOs and DON'Ts |
| 10 | `10_AI_ENGINE.md` | **AI architecture bible** — every model, engine, prompt contract, performance |

---

## How to Use This Hub

1. **New agent / developer?** Read `01` → `02` → `10` → `03` in order.
2. **Working on UI (Phase 1)?** `04_PHASE1_SPEC.md` + `05_DESIGN_SYSTEM.md` are your primary references.
3. **Wiring services?** `06_SERVICES_LAYER.md` defines every contract.
4. **Checking scope?** `07_FEATURE_MAP.md` + `08_ROADMAP.md` tell you what is and isn't in scope.
5. **Setting up locally?** `09_DEV_GUIDE.md` is your quickstart.
6. **Working on AI/models?** `10_AI_ENGINE.md` is the definitive reference.

---

## Technology Stack (locked)

```
UI           React 19 + TypeScript 5.8 + Vite 7
Desktop      Tauri 2
Orchestration Rust
Text AI      llama.cpp → LFM2.5-350M (default), SmolVLM2-256M (vision)
Audio AI     audio.cpp → Qwen3-ASR, PocketTTS, Chatterbox, SeedVC, Silero VAD, Qwen3-Aligner
Media        FFmpeg (clips, captions, frames) + yt-dlp (YouTube acquisition)
Database     libSQL / SQLite (local file — alfred.db)
Models       GGUF format throughout
```

---

## Golden Rules (must be known by all)

1. **Everything privacy-sensitive stays on device.** No content, transcripts, media, or AI inference leaves the machine. Ever.
2. **Sources are the spine of every project.** Add your research once; use it everywhere. Never ask the user to re-paste.
3. **Phase 1 is frontend-only.** No real AI, no real media processing, no backend. Mocked services only.
4. **Services are the seam.** The UI calls `projectService.create()`, not inline fake data. This is what makes Phase 2 a replacement, not a rewrite.
5. **Alfred is a desktop app, not a website.** No mobile-first responsive design. Keyboard-first. Information-dense without clutter.
6. **No Python. No FastAPI. No cloud AI APIs.** The AI stack is llama.cpp + audio.cpp — native C++ engines managed by Rust.
7. **LFM2.5 gets narrow, structured jobs.** Always prompt for JSON. Always validate JSON. Retry on malformed output.
8. **audio.cpp covers all audio.** ASR, TTS, voice cloning, VAD, alignment, conversion — one native binary, zero Conda environments.
9. **libSQL is the default DB.** Turso Cloud is opt-in and never the default. Alfred's privacy claim requires local-only data.
10. **Product feel over feature count.** Ship fewer things that feel premium over many things that feel rushed.

---

*Last updated: 2026-08-22*
