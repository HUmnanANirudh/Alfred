import type { CreateShortConfig, Job, Short, VideoPreset } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { runJob, type JobProgressHandler } from './jobRunner';
import { db } from './memory';

const HOOKS = [
  'Your research should never leave this machine.',
  'Stop pasting the same notes into five tools.',
  'The clip that travels is a concrete claim.',
  'Captions are how most people actually watch.',
  'A small model is enough if the job is narrow.',
];

export const shortService = {
  async list(projectId: string): Promise<Short[]> {
    await delay(400);
    return db.shorts.filter((s) => s.projectId === projectId).map((s) => ({ ...s }));
  },

  async get(id: string): Promise<Short | null> {
    await delay(250);
    const short = db.shorts.find((s) => s.id === id);
    return short ? { ...short } : null;
  },

  async getPresets(): Promise<VideoPreset[]> {
    await delay(200);
    return db.presets.map((p) => ({ ...p }));
  },

  async create(config: CreateShortConfig, onProgress?: JobProgressHandler): Promise<Job> {
    const job = await runJob(
      'render_short',
      [
        { label: 'Analyzing transcript', ms: 1500, engine: 'qwen3_asr' },
        { label: 'Finding strong moments', ms: 1500, engine: 'lfm2.5' },
        { label: 'Selecting clips', ms: 1200, engine: 'lfm2.5' },
        { label: 'Generating captions', ms: 2000, engine: 'ffmpeg' },
        { label: 'Rendering videos', ms: 2500, engine: 'ffmpeg' },
      ],
      { projectId: config.projectId, onProgress },
    );

    const count = Math.max(1, config.numberOfClips);
    for (let i = 0; i < count; i++) {
      const hook = HOOKS[i % HOOKS.length] ?? HOOKS[0];
      const short: Short = {
        id: generateId('shrt'),
        projectId: config.projectId,
        videoId: config.videoId,
        presetId: config.presetId,
        title: `Short ${i + 1}`,
        duration: 38 + i * 4,
        hook,
        confidence: 0.86 - i * 0.06,
        transcriptExcerpt: hook,
        captionsEnabled: config.captionsEnabled,
        captionStyle: config.captionStyle,
        status: 'done',
        createdAt: now(),
      };
      db.shorts.push(short);
    }
    return job;
  },

  async regenerate(id: string, onProgress?: JobProgressHandler): Promise<Job> {
    const existing = db.shorts.find((s) => s.id === id);
    if (!existing) throw new Error('We could not find that short.');
    existing.status = 'running';
    const job = await runJob(
      'render_short',
      [
        { label: 'Selecting a new moment', ms: 1200 },
        { label: 'Rendering videos', ms: 1800, engine: 'ffmpeg' },
      ],
      { projectId: existing.projectId, onProgress },
    );
    existing.hook = HOOKS[Math.floor(Math.random() * HOOKS.length)];
    existing.confidence = 0.78 + Math.random() * 0.15;
    existing.status = 'done';
    existing.createdAt = now();
    return job;
  },

  async delete(id: string): Promise<void> {
    await delay(350);
    db.shorts = db.shorts.filter((s) => s.id !== id);
  },
};
