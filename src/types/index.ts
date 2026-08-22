/**
 * Alfred — Canonical TypeScript Types
 * Single source of truth for all entity shapes.
 * Derived from 03_DATA_MODELS.md.
 *
 * Rules:
 *  - IDs are always strings, never numbers
 *  - Dates are ISO 8601 strings
 *  - Optional fields use ? — never null unless forced by external API
 *  - Enums as union strings, not TypeScript enum keyword
 *  - Metadata is typed and discriminated via a `type` field
 */

// ============================================================
// 1. Core Entities
// ============================================================

// ------------------------------------------------------------
// Project
// ------------------------------------------------------------

export type ProjectId = string;

export type Project = {
  id: ProjectId;                 // "proj_" + nanoid
  name: string;                  // "The Future of AI"
  description?: string;
  createdAt: string;             // ISO 8601
  updatedAt: string;
  stats?: ProjectStats;
};

export type ProjectStats = {
  sourceCount: number;
  videoCount: number;
  shortCount: number;
  transcriptCount: number;
  draftCount: number;
  audioCount: number;
};

// ------------------------------------------------------------
// Source
// ------------------------------------------------------------

export type SourceType = "article" | "youtube" | "video" | "text" | "transcript" | "pdf" | "epub" | "rss";

export type Source = {
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

export type SourceMetadata =
  | ArticleMetadata
  | YouTubeMetadata
  | VideoMetadata
  | TextMetadata
  | TranscriptSourceMetadata;

export type ArticleMetadata = {
  type: "article";
  domain?: string;
  author?: string;
  publishedAt?: string;
};

export type YouTubeMetadata = {
  type: "youtube";
  videoId: string;
  channelName?: string;
  duration?: number;             // seconds
  thumbnail?: string;
  views?: number;
};

export type VideoMetadata = {
  type: "video";
  duration?: number;
  filePath?: string;
  fileSize?: number;
};

export type TextMetadata = {
  type: "text";
};

export type TranscriptSourceMetadata = {
  type: "transcript";
  videoSourceId: string;
  videoId?: string;
};

// ------------------------------------------------------------
// Video
// ------------------------------------------------------------

export type Video = {
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

// ------------------------------------------------------------
// Transcript (first-class AI artifact)
// ------------------------------------------------------------

export type Transcript = {
  id: string;                    // "trs_" + nanoid
  videoId: string;
  projectId: string;
  segments: TranscriptSegment[];
  language?: string;             // detected language code
  engine?: string;               // "qwen3_asr" | "nemotron_asr" | etc.
  createdAt: string;
};

export type TranscriptSegment = {
  id: string;
  start: number;                 // seconds (float) — from ASR
  end: number;                   // seconds (float)
  text: string;
  speaker?: string;              // "Speaker 1", "Speaker 2" (from diarization)
  words?: WordTimestamp[];       // word-level from Qwen3-ForcedAligner
  confidence?: number;           // 0.0 – 1.0 segment confidence
};

export type WordTimestamp = {
  word: string;
  start: number;                 // seconds
  end: number;                   // seconds
  confidence?: number;
};

// ------------------------------------------------------------
// ClipCandidate (output of LFM2.5 clip analysis)
// ------------------------------------------------------------

export type ClipCandidate = {
  id: string;                    // "clip_" + nanoid
  transcriptId: string;
  videoId: string;
  projectId: string;
  startTime: number;             // seconds (float)
  endTime: number;               // seconds (float)
  hookScore: number;             // 0.0 – 1.0  <- LFM2.5 scored
  visualScore?: number;          // 0.0 – 1.0  <- SmolVLM2 scored
  speechScore?: number;          // 0.0 – 1.0  <- ASR confidence in segment
  hookText: string;              // the opening line / hook identified by LFM2.5
  reason: string;                // LFM2.5's explanation for selecting this moment
  transcriptExcerpt?: string;    // the segment text for this window
  createdAt: string;
};

// ------------------------------------------------------------
// Short (Generated Short-form Video)
// ------------------------------------------------------------

export type Short = {
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

// ------------------------------------------------------------
// Video Preset
// ------------------------------------------------------------

export type VideoPreset = {
  id: string;
  name: string;
  description: string;
  aspectRatio: "9:16" | "16:9" | "1:1";
  layout: PresetLayout;
  thumbnailPreview?: string;
};

export type PresetLayout =
  | "full_screen"
  | "speaker_gameplay"
  | "speaker_background"
  | "split_screen"
  | "podcast"
  | "captions_focus"
  | "custom";

// ------------------------------------------------------------
// Voice
// ------------------------------------------------------------

export type Voice = {
  id: string;                    // "vce_" + nanoid
  name: string;                  // "Alex", "My Voice"
  samplePath?: string;           // reference audio for cloning
  engine: VoiceEngine;           // which audio.cpp family handles this voice
  isDefault?: boolean;
  isCloned: boolean;             // true = user-created clone
  createdAt: string;
};

/** The audio.cpp family used for this voice's TTS/cloning */
export type VoiceEngine =
  | "pocket_tts"
  | "chatterbox"
  | "qwen3_tts"
  | "supertonic"
  | "miotts"
  | "vibevoice"
  | "rvc"
  | "seed_vc";

// ------------------------------------------------------------
// AudioGeneration
// ------------------------------------------------------------

export type AudioGeneration = {
  id: string;                    // "aud_" + nanoid
  projectId: string;
  voiceId: string;
  voiceName: string;
  title?: string;
  script: string;
  duration?: number;             // seconds
  filePath?: string;
  engine?: string;               // audio.cpp family used
  status: JobStatus;
  sourceIds?: string[];          // project sources used to generate script
  createdAt: string;
  updatedAt?: string;
};

// ------------------------------------------------------------
// WritingOutput
// ------------------------------------------------------------

export type WritingType = "article" | "x_post" | "thread" | "linkedin";

export type WritingOutput = {
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

export type SocialPost = {
  id: string;                    // "pst_" + nanoid
  outputId: string;              // parent WritingOutput
  index: number;                 // 1-based position in thread
  content: string;
};

export type WritingTone = "professional" | "casual" | "educational" | "sharp" | "conversational";

// ------------------------------------------------------------
// Job (Async Operation Tracking)
// ------------------------------------------------------------

export type JobStatus = "idle" | "pending" | "running" | "done" | "error";

export type Job = {
  id: string;                    // "job_" + nanoid
  type: JobType;
  status: JobStatus;
  projectId?: string;
  steps: JobStep[];
  error?: string;
  createdAt: string;
  updatedAt: string;
};

export type JobType =
  | "add_source"
  | "fetch_article"
  | "process_youtube"
  | "process_video"
  | "extract_frames"             // FFmpeg -> SmolVLM2
  | "analyze_frames"             // SmolVLM2 visual analysis
  | "generate_transcript"        // audio.cpp ASR
  | "align_transcript"           // audio.cpp Qwen3-ForcedAligner
  | "analyze_clips"              // LFM2.5 clip candidate selection
  | "render_short"               // FFmpeg clip rendering
  | "generate_audio"             // audio.cpp TTS
  | "clone_voice"                // audio.cpp voice cloning
  | "generate_article"           // LFM2.5 text generation
  | "generate_social"
  | "diarize_transcript"
  | "separate_audio"
  | "generate_podcast";

export type JobStep = {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "error";
  engine?: string;               // which engine is handling this step
};

// ------------------------------------------------------------
// AIModel (Installed Model Registry)
// ------------------------------------------------------------

export type AIModelEngine = "llama_cpp" | "audio_cpp";
export type AIModelRole = "text" | "vision" | "asr" | "tts" | "clone" | "vc" | "vad" | "align" | "sep";
export type AIModelStatus = "not_installed" | "downloading" | "installed" | "loading" | "ready";

export type AIModel = {
  id: string;                    // package id e.g. "qwen3_asr_0_6b_q8_0"
  family: string;                // audio.cpp family: "qwen3_asr", "pocket_tts" etc.
  engine: AIModelEngine;
  role: AIModelRole;
  displayName: string;           // "Qwen3 ASR 0.6B Q8"
  filePath?: string;
  sizeMB?: number;
  status: AIModelStatus;
  isDefault: boolean;            // Alfred's recommended default for this role
  downloadProgress?: number;     // 0-100 during download
  installedAt?: string;
};

// ============================================================
// 2. LFM2.5 Structured Prompt Outputs
// ============================================================

/** Clip selection output schema — always request JSON from LFM2.5 */
export type ClipSelectionOutput = {
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

/** Writing generation output schema — article */
export type ArticleOutput = {
  title: string;
  content: string;               // markdown
  summary: string;               // 1-2 sentence excerpt
};

/** Writing generation output schema — social posts */
export type SocialPostsOutput = {
  posts: Array<{
    index: number;
    content: string;
  }>;
};

// ============================================================
// 3. UI-Only Types (do not persist)
// ============================================================

/** Sidebar navigation section identifiers */
export type NavSection =
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

/** Reusable source selector component props */
export type SourceSelectorProps = {
  projectId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  filterTypes?: SourceType[];
};

/** Toast notification */
export type Toast = {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
  detail?: string;
  duration?: number;
};

/** Engine status for the status bar */
export type EngineStatus = {
  engine: "llama_cpp" | "audio_cpp";
  status: "offline" | "starting" | "ready" | "busy";
  loadedModel?: string;
};

// ============================================================
// 4. Service Result Types (from 06_SERVICES_LAYER.md)
// ============================================================

export type FetchArticleResult =
  | { success: true; data: Partial<Source> }
  | { success: false; reason: "extraction_failed" | "paywall" | "network_error" };

export type AddYouTubeResult =
  | { success: true; source: Source }
  | { success: false; reason: "invalid_url" | "private_video" | "network_error" };

export type StorageUsage = {
  projects: number;  // bytes
  models: number;    // bytes
  exports: number;   // bytes
};

export type EngineHealth = {
  llama: boolean;
  audio: boolean;
  ffmpeg: boolean;
  ytdlp: boolean;
};

// ============================================================
// 5. Service Config Types (from 06_SERVICES_LAYER.md)
// ============================================================

export type CreateShortConfig = {
  projectId: string;
  videoId?: string;
  sourceIds?: string[];
  presetId: string;
  captionsEnabled: boolean;
  captionStyle?: string;
  findClipsAuto: boolean;
  numberOfClips: number;
  brollPath?: string;
};

export type GenerateAudioConfig = {
  projectId: string;
  voiceId: string;
  script: string;
  title?: string;
  sourceIds?: string[];
};

export type GeneratePodcastConfig = {
  projectId: string;
  voiceIds: string[];
  script?: string;
  title?: string;
  sourceIds?: string[];
};

export type GenerateArticleConfig = {
  projectId: string;
  title?: string;
  topic: string;
  sourceIds: string[];
  tone?: WritingTone;
  length?: "short" | "medium" | "long";
};

export type GenerateSocialConfig = {
  projectId: string;
  topic?: string;
  sourceIds: string[];
  tone?: WritingTone;
  style?: string;
  postCount?: number;    // for threads
};

// ============================================================
// 6. Design System UI Types (from 05_DESIGN_SYSTEM.md)
// ============================================================

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "link";
export type ButtonSize = "sm" | "md" | "lg";
export type BadgeVariant = "default" | "success" | "error" | "warning" | "accent";
