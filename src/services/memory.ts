import type {
  AIModel,
  AudioGeneration,
  Project,
  Short,
  SocialPost,
  Source,
  Transcript,
  Video,
  VideoPreset,
  Voice,
  WritingOutput,
} from '../types';
import { generateId } from '../utils/id';
import { now } from '../utils/mock';

const created = now();

export const MOCK_ARTICLE = `Local models change how a creator works.

When research lives in one place, every format — a short, a thread, a long article — can draw from the same notes without re-pasting. Alfred is built around that idea: sources first, then the work that follows.

The useful constraint is privacy. If transcripts, drafts, and voice samples never leave the machine, you can work from material you would not send to a hosted model. That includes unpublished interviews, client briefs, and half-finished scripts.

A small text model is enough when the job is narrow. Extract a hook. Rank three clip windows. Turn a transcript excerpt into five posts. Structured JSON beats an open chat for those tasks, because the rest of the pipeline can trust the shape of the result.

Video is slower. Frames, captions, and renders belong to FFmpeg. Speech belongs to a local ASR stack. The UI should never pretend those jobs are instant; it should show the steps and let you keep working in another section.

This mock article exists so Phase 1 can feel complete. In Phase 2 the same screen will wait on llama.cpp instead of a timer. The layout does not change.`;

export const MOCK_TRANSCRIPT_TEXTS = [
  'Welcome back. Today we are talking about working locally with research, not sending it out.',
  'The first habit that actually sticks is a single source library for every project.',
  'If you paste the same notes into five tools, you will lose the thread and the citations.',
  'A butler metaphor is useful here. You bring the material in once. Alfred does the tedious conversion work.',
  'Privacy is not a banner. It is a constraint on architecture.',
  'Transcription should happen on device, even when the file is long.',
  'Word-level timestamps matter later, when you cut shorts from the same talk.',
  'A good hook is usually a concrete claim, not a vague question.',
  'Watch how often people start with "so I have been thinking" — that is rarely the clip.',
  'The moment that travels is the sentence you can put on a thumbnail.',
  'For writing, the same transcript becomes an outline, then an article, then a thread.',
  'Tone is a slider, not a personality transplant.',
  'Professional does not mean corporate. It means specific and calm.',
  'Casual still needs a point. Otherwise it is just filler.',
  'When we generate shorts, we score speech, visuals, and hook strength separately.',
  'A visually quiet talking-head can still win if the line is sharp.',
  'Captions are not decoration. They are how most people watch with the sound off.',
  'Preset layouts exist so you are not designing a 9:16 frame from scratch every time.',
  'Full screen is honest. Split screen is for contrast. Captions-focus is for density.',
  'Audio generation is the other half of the same research pile.',
  'A cloned voice should stay on this machine, period.',
  'If the script is weak, a better voice will not save it.',
  'That is the whole pitch: one project, many formats, nothing leaving the desk.',
  'Next we will look at how sources feed writing without another paste.',
  'Thanks for watching. Save this to a project and reuse it.',
];

function buildTranscript(projectId: string, videoId: string): Transcript {
  let t = 0;
  const segments = MOCK_TRANSCRIPT_TEXTS.map((text) => {
    const start = t;
    const end = t + 8.4;
    t = end + 0.6;
    return {
      id: generateId('seg'),
      start,
      end,
      text,
      speaker: 'Speaker 1',
      confidence: 0.92,
    };
  });

  return {
    id: generateId('trs'),
    videoId,
    projectId,
    segments,
    language: 'en',
    engine: 'qwen3_asr',
    createdAt: created,
  };
}

export const VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'preset_full',
    name: 'Full Screen',
    description: 'Full-screen vertical',
    aspectRatio: '9:16',
    layout: 'full_screen',
  },
  {
    id: 'preset_captions',
    name: 'Captions Focus',
    description: 'Large captions, speaker cropped',
    aspectRatio: '9:16',
    layout: 'captions_focus',
  },
  {
    id: 'preset_split',
    name: 'Split Screen',
    description: 'Speaker over gameplay or B-roll',
    aspectRatio: '9:16',
    layout: 'split_screen',
  },
  {
    id: 'preset_podcast',
    name: 'Podcast',
    description: 'Two-up conversation layout',
    aspectRatio: '1:1',
    layout: 'podcast',
  },
  {
    id: 'preset_background',
    name: 'Speaker + Background',
    description: 'Subject keyed over a still or loop',
    aspectRatio: '9:16',
    layout: 'speaker_background',
  },
  {
    id: 'preset_gameplay',
    name: 'Speaker + Gameplay',
    description: 'Face cam with gameplay fill',
    aspectRatio: '9:16',
    layout: 'speaker_gameplay',
  },
];

export const DEFAULT_VOICES: Voice[] = [
  {
    id: 'vce_alex0',
    name: 'Alex',
    engine: 'pocket_tts',
    isDefault: true,
    isCloned: false,
    createdAt: created,
  },
  {
    id: 'vce_sarah',
    name: 'Sarah',
    engine: 'pocket_tts',
    isDefault: false,
    isCloned: false,
    createdAt: created,
  },
  {
    id: 'vce_james',
    name: 'James',
    engine: 'chatterbox',
    isDefault: false,
    isCloned: false,
    createdAt: created,
  },
];

export const DEFAULT_MODELS: AIModel[] = [
  {
    id: 'lfm2.5-350m-q4_k_m',
    family: 'lfm2.5',
    engine: 'llama_cpp',
    role: 'text',
    displayName: 'LFM2.5 350M Q4',
    sizeMB: 240,
    status: 'ready',
    isDefault: true,
    installedAt: created,
  },
  {
    id: 'qwen3_asr_0_6b_q8_0',
    family: 'qwen3_asr',
    engine: 'audio_cpp',
    role: 'asr',
    displayName: 'Qwen3 ASR 0.6B Q8',
    sizeMB: 620,
    status: 'ready',
    isDefault: true,
    installedAt: created,
  },
  {
    id: 'smolvlm2-256m',
    family: 'smolvlm2',
    engine: 'llama_cpp',
    role: 'vision',
    displayName: 'SmolVLM2 256M',
    sizeMB: 180,
    status: 'installed',
    isDefault: true,
    installedAt: created,
  },
  {
    id: 'pocket_tts',
    family: 'pocket_tts',
    engine: 'audio_cpp',
    role: 'tts',
    displayName: 'PocketTTS',
    sizeMB: 90,
    status: 'not_installed',
    isDefault: true,
  },
  {
    id: 'chatterbox_q8',
    family: 'chatterbox',
    engine: 'audio_cpp',
    role: 'clone',
    displayName: 'Chatterbox Q8',
    sizeMB: 410,
    status: 'not_installed',
    isDefault: true,
  },
];

export type MemoryDb = {
  projects: Project[];
  sources: Source[];
  videos: Video[];
  transcripts: Transcript[];
  shorts: Short[];
  audio: AudioGeneration[];
  writing: WritingOutput[];
  socialPosts: SocialPost[];
  voices: Voice[];
  models: AIModel[];
  presets: VideoPreset[];
};

export const db: MemoryDb = {
  projects: [],
  sources: [],
  videos: [],
  transcripts: [],
  shorts: [],
  audio: [],
  writing: [],
  socialPosts: [],
  voices: [...DEFAULT_VOICES],
  models: [...DEFAULT_MODELS],
  presets: [...VIDEO_PRESETS],
};

export function makeMockTranscript(projectId: string, videoId: string): Transcript {
  return buildTranscript(projectId, videoId);
}

export function computeStats(projectId: string) {
  return {
    sourceCount: db.sources.filter((s) => s.projectId === projectId).length,
    videoCount: db.videos.filter((v) => v.projectId === projectId).length,
    shortCount: db.shorts.filter((s) => s.projectId === projectId).length,
    transcriptCount: db.transcripts.filter((t) => t.projectId === projectId).length,
    draftCount: db.writing.filter((w) => w.projectId === projectId).length,
    audioCount: db.audio.filter((a) => a.projectId === projectId).length,
  };
}
