# Alfred — Feature Map

> Complete breakdown of every feature across all phases.
> Use this to determine what is IN scope, OUT of scope, or deferred.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented / in scope for this phase |
| 🔶 | Partial / mocked |
| ⏳ | Deferred to a later phase |
| ❌ | Explicitly out of scope (may never be built) |

---

## 1. App Shell & Navigation

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| App window (Tauri) | ✅ | ✅ | ✅ |
| Empty workspace screen | ✅ | ✅ | ✅ |
| Project sidebar | ✅ | ✅ | ✅ |
| Project switcher | ✅ | ✅ | ✅ |
| Command palette (Cmd+K) | ✅ | ✅ | ✅ |
| Keyboard shortcuts | ✅ | ✅ | ✅ |
| Status bar (`● Local`) | ✅ | ✅ | ✅ |
| Engine status indicator (llama.cpp / audio.cpp ready) | 🔶 mock | ✅ real | ✅ |
| Toast notifications | ✅ | ✅ | ✅ |
| Settings screen | 🔶 mock | ✅ real | ✅ |
| Voices screen (global) | 🔶 mock | ✅ real | ✅ |
| Responsive collapse (1024px) | ✅ | ✅ | ✅ |

---

## 2. Projects

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Create project (modal) | 🔶 mock | ✅ libSQL | ✅ |
| List projects | 🔶 mock | ✅ libSQL | ✅ |
| Project overview (stats, recent activity) | 🔶 mock | ✅ real | ✅ |
| Delete project | 🔶 mock | ✅ | ✅ |
| Edit project name/description | 🔶 mock | ✅ | ✅ |
| Project archive / inactive state | ⏳ | ⏳ | ✅ |
| Project export (ZIP) | ⏳ | ⏳ | ✅ |

---

## 3. Sources

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Sources screen (list + search) | ✅ | ✅ | ✅ |
| Add source modal | ✅ | ✅ | ✅ |
| Article URL fetch (Rust readability/spider) | 🔶 mock | ✅ Rust | ✅ |
| Article manual paste fallback | ✅ | ✅ | ✅ |
| YouTube URL source | 🔶 mock | ✅ yt-dlp | ✅ |
| Local video file source | 🔶 mock | ✅ | ✅ |
| Paste text source | ✅ | ✅ | ✅ |
| Source summarisation by LFM2.5 | ⏳ | ✅ llama.cpp | ✅ |
| Source detail view | ✅ | ✅ | ✅ |
| Edit source | 🔶 mock | ✅ | ✅ |
| Delete source | 🔶 mock | ✅ | ✅ |
| Source search / filter | ✅ UI | ✅ DB | ✅ |
| Source reusable selector component | ✅ | ✅ | ✅ |
| Source drawer (persistent panel) | ⏳ | ✅ | ✅ |
| PDF import | ❌ | ⏳ | ✅ |
| RSS feed source import | ❌ | ⏳ | ✅ |
| Twitter/X thread import | ❌ | ⏳ | ✅ |

---

## 4. Video & Transcript

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Video list | 🔶 mock | ✅ | ✅ |
| Add video from YouTube | 🔶 mock | ✅ yt-dlp | ✅ |
| Add video from local file | 🔶 mock | ✅ | ✅ |
| Video thumbnail | 🔶 placeholder | ✅ FFmpeg | ✅ |
| Transcript generation | 🔶 mock | ✅ audio.cpp Qwen3-ASR | ✅ |
| Word-level timestamps | 🔶 schema only | ✅ audio.cpp Qwen3-ForcedAligner | ✅ |
| VAD-based chunk splitting | ⏳ | ✅ audio.cpp Silero VAD | ✅ |
| Transcript viewer (timestamped) | ✅ | ✅ | ✅ |
| Transcript editing / correction | ⏳ | ⏳ | ✅ |
| Speaker diarization | ⏳ | ⏳ | ✅ audio.cpp Sortformer |

---

## 5. Short Generation

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Create Short full flow | 🔶 mock | ✅ | ✅ |
| Preset selection (visual cards) | ✅ | ✅ | ✅ |
| **Video frame extraction (FFmpeg)** | ⏳ | ✅ | ✅ |
| **Visual scene analysis (SmolVLM2)** | ⏳ | ✅ llama.cpp | ✅ |
| **Unified timeline (text + visual)** | ⏳ | ✅ | ✅ |
| **Clip scoring (LFM2.5-350M structured JSON)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **Hook generation (LFM2.5)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **ClipCandidate entity stored in DB** | 🔶 schema only | ✅ | ✅ |
| Caption overlay | 🔶 mock | ✅ FFmpeg | ✅ |
| Caption style selection | ✅ UI | ✅ real | ✅ |
| Short preview / playback | 🔶 placeholder | ✅ | ✅ |
| Short export | ⏳ | ✅ | ✅ |
| Regenerate short | 🔶 mock | ✅ | ✅ |
| Custom preset builder | ⏳ | ⏳ | ✅ |
| B-roll / background video layer | ⏳ | ⏳ | ✅ |

---

## 6. Audio

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Audio generation screen | ✅ | ✅ | ✅ |
| Script input (manual) | ✅ | ✅ | ✅ |
| Script generation from sources (LFM2.5) | 🔶 UI only | ✅ llama.cpp | ✅ |
| Voice selection modal | ✅ | ✅ | ✅ |
| Voice preview | 🔶 placeholder | ✅ audio.cpp | ✅ |
| **TTS (audio.cpp PocketTTS)** | 🔶 mock | ✅ | ✅ |
| Audio playback | 🔶 placeholder | ✅ | ✅ |
| Audio export | ⏳ | ✅ | ✅ |
| Regenerate audio | 🔶 mock | ✅ | ✅ |
| Waveform visualisation | 🔶 placeholder | ✅ | ✅ |
| **Voice cloning (audio.cpp Chatterbox)** | 🔶 mock UI | ✅ | ✅ |
| **Voice conversion (audio.cpp SeedVC/RVC)** | ⏳ | ✅ | ✅ |
| **Voice design** | ⏳ | ⏳ | ✅ |
| Source separation | ⏳ | ⏳ | ✅ audio.cpp HTDemucs |
| Podcast episode generation (multi-speaker) | ⏳ | ⏳ | ✅ |

---

## 7. Writing

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Writing section (tabs) | ✅ | ✅ | ✅ |
| **Article generation (LFM2.5-350M)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **X post generation (LFM2.5-350M)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **Thread generation (LFM2.5-350M)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **LinkedIn post (LFM2.5-350M)** | 🔶 mock | ✅ llama.cpp | ✅ |
| **Structured JSON output validation** | ⏳ | ✅ | ✅ |
| **Retry on malformed LFM2.5 JSON** | ⏳ | ✅ | ✅ |
| Editable social post cards | ✅ | ✅ | ✅ |
| Source selection for all writing | ✅ UI | ✅ context injection | ✅ |
| Tone / style selection | ✅ UI | ✅ prompt | ✅ |
| Regenerate (full output) | 🔶 mock | ✅ | ✅ |
| Rewrite selection (LFM2.5) | ⏳ | ✅ | ✅ |
| Expand / shorten selection (LFM2.5) | ⏳ | ✅ | ✅ |
| Copy to clipboard | ✅ | ✅ | ✅ |
| Export as markdown / txt | ⏳ | ✅ | ✅ |
| Model field logged on output | ⏳ | ✅ | ✅ |

---

## 8. Voices (Global)

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| Voice list | 🔶 mock (3 defaults) | ✅ | ✅ |
| **Add voice — audio.cpp Chatterbox cloning** | 🔶 mock UI | ✅ | ✅ |
| **VoiceEngine field on Voice entity** | ✅ schema | ✅ real | ✅ |
| Delete voice | 🔶 mock | ✅ | ✅ |
| Voice preview | 🔶 placeholder | ✅ audio.cpp | ✅ |
| Privacy badge ("stays on device") | ✅ | ✅ | ✅ |
| Multiple custom voices | ⏳ | ✅ | ✅ |

---

## 9. Settings & Model Management

| Feature | Phase 1 | Phase 2 | Phase 3+ |
|---------|---------|---------|----------|
| General settings | 🔶 UI only | ✅ | ✅ |
| Default export directory | 🔶 UI only | ✅ FS | ✅ |
| **AI Models — llama.cpp models** | 🔶 mock | ✅ real install | ✅ |
| **AI Models — audio.cpp models** | 🔶 mock | ✅ audiocpp_model_manager | ✅ |
| **Model download progress** | ⏳ | ✅ | ✅ |
| **Engine status (llama-server / audiocpp_server)** | 🔶 mock | ✅ | ✅ |
| Privacy section (local processing) | ✅ static | ✅ live | ✅ |
| Storage usage display | 🔶 mock | ✅ real | ✅ |
| Keyboard shortcut reference | ⏳ | ✅ | ✅ |

---

## 10. Backend / Infra (Phase 2+)

| Feature | Phase | Engine |
|---------|-------|--------|
| Tauri Rust command handlers | Phase 2 | Rust |
| libSQL local database | Phase 2 | libsql-client-rs |
| yt-dlp integration | Phase 2 | sidecar binary |
| FFmpeg video frame extraction | Phase 2 | sidecar binary |
| FFmpeg clip rendering + captions | Phase 2 | sidecar binary |
| SmolVLM2 visual analysis | Phase 2 | llama.cpp |
| LFM2.5 text generation | Phase 2 | llama.cpp |
| Qwen3-ASR transcription | Phase 2 | audio.cpp |
| Qwen3-ForcedAligner alignment | Phase 2 | audio.cpp |
| Silero VAD chunk detection | Phase 2 | audio.cpp |
| PocketTTS text-to-speech | Phase 2 | audio.cpp |
| Chatterbox voice cloning | Phase 2 | audio.cpp |
| SeedVC voice conversion | Phase 2 | audio.cpp |
| audiocpp_model_manager integration | Phase 2 | audio.cpp native |
| Sortformer diarization | Phase 3 | audio.cpp |
| HTDemucs source separation | Phase 3 | audio.cpp |
| Turso Cloud sync (opt-in only) | Phase 4+ | libSQL sync |

---

## 11. Explicitly Out of Scope (All Phases)

| Feature | Reason |
|---------|--------|
| FastAPI / Python sidecar | Replaced by native llama.cpp + audio.cpp |
| Python audio stack (Whisper Python, TTS Python) | Replaced by audio.cpp |
| Cloud AI APIs (OpenAI, Anthropic, etc.) | Violates privacy-first principle |
| User accounts / authentication | Local app, no server |
| Real-time collaboration | Not in product vision |
| Mobile app | Desktop only |
| Turso Cloud as default database | Privacy: local-first means local DB |
| In-app payments / subscriptions | Separate concern |

---

*Next: [08_ROADMAP.md](./08_ROADMAP.md)*
