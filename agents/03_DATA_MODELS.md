# Alfred — Canonical Data Models

> These TypeScript types are the **single source of truth** for the shape of every entity in Alfred.
> The Rust structs and database schema must derive from these.
> Do not invent fields in components. Add them here first.

---

## 1. Core Entities

### Project

```typescript
type Project = {
  id: string;                    // "proj_" + nanoid
  name: string;                  // "The Future of AI"
  description?: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  stats?: ProjectStats;
};

type ProjectStats = {
  sourceCount: number;
  videoCount: number;
  shortCount: number;
  transcriptCount: number;
  draftCount: number;
  audioCount: number;
};
```

---

### Source

```typescript
type SourceType = "article" | "youtube" | "video" | "text";

type Source = {
  id: string;                    // "src_" + nanoid
  projectId: string;
  type: SourceType;
  title: string;
  content?: string;              // extracted or pasted text
  url?: string;
  wordCount?: number;
  excerpt?: string;              // first ~200 chars for preview
  metadata?: SourceMetadata;
  createdAt: string;
};

type SourceMetadata =
  | ArticleMetadata
  | YouTubeMetadata
  | VideoMetadata
  | TextMetadata;

type ArticleMetadata = {
  type: "article";
  domain?: string;
  author?: string;
  publishedAt?: string;
};

type YouTubeMetadata = {
  type: "youtube";
  videoId: string;
  channelName?: string;
  duration?: number;             // seconds
  thumbnail?: string;
  views?: number;
};

type VideoMetadata = {
  type: "video";
  duration?: number;
  filePath?: string;
  fileSize?: number;
};

type TextMetadata = {
  type: "text";
};
```

---

### Video

```typescript
type Video = {
  id: string;                    // "vid_" + nanoid
  projectId: string;
  sourceId?: string;
  title: string;
  duration?: number;             // seconds
  filePath?: string;
  thumbnailPath?: string;
  url?: string;
  hasTranscript: boolean;
  createdAt: string;
};
```

---

### Transcript (first-class AI artifact)

The transcript is not just a display string — it is a structured AI artifact that powers clip selection, writing generation, and knowledge retrieval.

```typescript
type Transcript = {
  id: string;                    // "trs_" + nanoid
  videoId: string;
  projectId: string;
  segments: TranscriptSegment[];
  language?: string;             // detected language code
  engine?: string;               // "qwen3_asr" | "nemotron_asr" | etc.
  createdAt: string;
};

type TranscriptSegment = {
  id: string;
  start: number;                 // seconds (float) — from ASR
  end: number;                   // seconds (float)
  text: string;
  speaker?: string;              // "Speaker 1", "Speaker 2" (from diarization)
  words?: WordTimestamp[];       // word-level from Qwen3-ForcedAligner
  confidence?: number;           // 0.0 – 1.0 segment confidence
};

type WordTimestamp = {
  word: string;
  start: number;                 // seconds
  end: number;                   // seconds
  confidence?: number;
};
```

> **Why first-class?** The transcript links video timestamps to text.
> Clip selection, hook detection, article generation, and source search all use it.
> Every generated short knows exactly which transcript segment it came from.

---

### ClipCandidate (output of LFM2.5 clip analysis)

After transcript + visual analysis, LFM2.5-350M produces structured clip candidates. These are stored and ranked before FFmpeg renders the final short.

```typescript
type ClipCandidate = {
  id: string;                    // "clip_" + nanoid
  transcriptId: string;
  videoId: string;
  projectId: string;
  startTime: number;             // seconds (float)
  endTime: number;               // seconds (float)
  hookScore: number;             // 0.0 – 1.0  ← LFM2.5 scored
  visualScore?: number;          // 0.0 – 1.0  ← SmolVLM2 scored
  speechScore?: number;          // 0.0 – 1.0  ← ASR confidence in segment
  hookText: string;              // the opening line / hook identified by LFM2.5
  reason: string;                // LFM2.5's explanation for selecting this moment
  transcriptExcerpt?: string;    // the segment text for this window
  createdAt: string;
};
```

---

### Short (Generated Short-form Video)

```typescript
type Short = {
  id: string;                    // "shrt_" + nanoid
  projectId: string;
  videoId: string;
  clipCandidateId?: string;      // which ClipCandidate this was rendered from
  presetId: string;
  title?: string;
  duration?: number;             // seconds
  filePath?: string;
  thumbnailPath?: string;
  hook?: string;
  confidence?: number;           // 0.0 – 1.0
  transcriptExcerpt?: string;
  captionsEnabled: boolean;
  captionStyle?: string;
  status: JobStatus;
  createdAt: string;
};
```

---

### Video Preset

```typescript
type VideoPreset = {
  id: string;
  name: string;
  description: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  layout: PresetLayout;
  thumbnailPreview?: string;
};

type PresetLayout =
  | "full_screen"
  | "speaker_gameplay"
  | "speaker_background"
  | "split_screen"
  | "podcast"
  | "captions_focus"
  | "custom";
```

---

### Voice

```typescript
type Voice = {
  id: string;                    // "vce_" + nanoid
  name: string;                  // "Alex", "My Voice"
  samplePath?: string;           // reference audio for cloning
  engine: VoiceEngine;           // which audio.cpp family handles this voice
  isDefault?: boolean;
  isCloned: boolean;             // true = user-created clone
  createdAt: string;
};

// The audio.cpp family used for this voice's TTS/cloning
type VoiceEngine =
  | "pocket_tts"
  | "chatterbox"
  | "qwen3_tts"
  | "supertonic"
  | "miotts"
  | "vibevoice"
  | "rvc"
  | "seed_vc";
```

---

### AudioGeneration

```typescript
type AudioGeneration = {
  id: string;                    // "aud_" + nanoid
  projectId: string;
  voiceId: string;
  voiceName: string;
  script: string;
  duration?: number;             // seconds
  filePath?: string;
  engine?: string;               // audio.cpp family used
  status: JobStatus;
  sourceIds?: string[];          // project sources used to generate script
  createdAt: string;
};
```

---

### WritingOutput

```typescript
type WritingType = "article" | "x_post" | "thread" | "linkedin";

type WritingOutput = {
  id: string;                    // "wrt_" + nanoid
  projectId: string;
  type: WritingType;
  title?: string;
  content: string;               // markdown or plain text
  sourceIds: string[];           // project sources used as context
  tone?: WritingTone;
  model?: string;                // "lfm2.5-350m-q4_k_m" (for future audit)
  status: JobStatus;
  createdAt: string;
};

type SocialPost = {
  id: string;                    // "pst_" + nanoid
  outputId: string;              // parent WritingOutput
  index: number;                 // 1-based position in thread
  content: string;
};

type WritingTone = "professional" | "casual" | "educational" | "sharp" | "conversational";
```

---

### Job (Async Operation Tracking)

```typescript
type JobStatus = "idle" | "pending" | "running" | "done" | "error";

type Job = {
  id: string;                    // "job_" + nanoid
  type: JobType;
  status: JobStatus;
  projectId?: string;
  steps: JobStep[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

type JobType =
  | "add_source"
  | "fetch_article"
  | "process_youtube"
  | "process_video"
  | "extract_frames"             // FFmpeg → SmolVLM2
  | "analyze_frames"             // SmolVLM2 visual analysis
  | "generate_transcript"        // audio.cpp ASR
  | "align_transcript"           // audio.cpp Qwen3-ForcedAligner
  | "analyze_clips"              // LFM2.5 clip candidate selection
  | "render_short"               // FFmpeg clip rendering
  | "generate_audio"             // audio.cpp TTS
  | "clone_voice"                // audio.cpp voice cloning
  | "generate_article"           // LFM2.5 text generation
  | "generate_social";           // LFM2.5 text generation

type JobStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  engine?: string;               // which engine is handling this step
};
```

---

### AIModel (Installed Model Registry)

```typescript
type AIModelEngine = "llama_cpp" | "audio_cpp";
type AIModelRole = "text" | "vision" | "asr" | "tts" | "clone" | "vc" | "vad" | "align" | "sep";
type AIModelStatus = "not_installed" | "downloading" | "installed" | "loading" | "ready";

type AIModel = {
  id: string;                    // package id e.g. "qwen3_asr_0_6b_q8_0"
  family: string;                // audio.cpp family: "qwen3_asr", "pocket_tts" etc.
  engine: AIModelEngine;
  role: AIModelRole;
  displayName: string;           // "Qwen3 ASR 0.6B Q8"
  filePath?: string;
  sizeMB?: number;
  status: AIModelStatus;
  isDefault: boolean;            // Alfred's recommended default for this role
  downloadProgress?: number;    // 0–100 during download
  installedAt?: string;
};
```

---

## 2. LFM2.5 Structured Prompt Outputs

LFM2.5-350M works best with **narrow, structured jobs** — not open-ended generation. Alfred should always request JSON from it and validate the schema before using results.

### Clip selection output schema
```typescript
type ClipSelectionOutput = {
  clips: Array<{
    start: number;               // seconds
    end: number;                 // seconds
    hook_score: number;          // 0.0 – 1.0
    visual_score?: number;
    speech_score?: number;
    hook: string;                // the opening hook line
    reason: string;              // brief explanation
  }>;
};
```

### Writing generation output schema
```typescript
type ArticleOutput = {
  title: string;
  content: string;               // markdown
  summary: string;               // 1–2 sentence excerpt
};

type SocialPostsOutput = {
  posts: Array<{
    index: number;
    content: string;
  }>;
};
```

---

## 3. UI-Only Types (do not persist)

```typescript
// Sidebar navigation
type NavSection =
  | "overview"
  | "sources"
  | "video"
  | "video_transcripts"
  | "video_shorts"
  | "audio"
  | "writing_article"
  | "writing_x"
  | "writing_thread"
  | "writing_linkedin";

// Reusable source selector
type SourceSelectorProps = {
  projectId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  filterTypes?: SourceType[];
};

// Toast
type Toast = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  detail?: string;
  duration?: number;
};

// Engine status (for status bar)
type EngineStatus = {
  engine: "llama_cpp" | "audio_cpp";
  status: "offline" | "starting" | "ready" | "busy";
  loadedModel?: string;
};
```

---

## 4. ID Convention

| Entity | Prefix | Example |
|--------|--------|---------|
| Project | `proj_` | `proj_k7m2n` |
| Source | `src_` | `src_x91ab` |
| Video | `vid_` | `vid_3dn2q` |
| Transcript | `trs_` | `trs_pp1c8` |
| ClipCandidate | `clip_` | `clip_n7r3s` |
| Short | `shrt_` | `shrt_q9w2e` |
| Audio | `aud_` | `aud_a7f3j` |
| Writing | `wrt_` | `wrt_b4k8l` |
| Social Post | `pst_` | `pst_i2c5v` |
| Voice | `vce_` | `vce_m9d4n` |
| Job | `job_` | `job_r1s6y` |

Use `nanoid(5)` for the suffix.

---

## 5. Rules for Data Models

1. **Define here first** — no ad-hoc types in component files.
2. **IDs are always strings** — never numbers, never auto-increment.
3. **Dates are ISO 8601 strings.**
4. **Optional fields use `?`** — never `null` unless forced by an external API.
5. **Enums as union strings** — `"article" | "youtube"`, not TypeScript `enum`.
6. **Metadata is typed and discriminated** — use a `type` field as discriminant.
7. **LFM2.5 outputs are always JSON** — define the schema here and validate before use.
8. **Engine fields are always present on persisted entities** — track which model produced what.

---

*Next: [04_PHASE1_SPEC.md](./04_PHASE1_SPEC.md)*
