import type { AudioGeneration, GenerateAudioConfig, Job } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { runJob, type JobProgressHandler } from './jobRunner';
import { db } from './memory';

export const audioService = {
  async list(projectId: string): Promise<AudioGeneration[]> {
    await delay(400);
    return db.audio.filter((a) => a.projectId === projectId).map((a) => ({ ...a }));
  },

  async get(id: string): Promise<AudioGeneration | null> {
    await delay(250);
    const item = db.audio.find((a) => a.id === id);
    return item ? { ...item } : null;
  },

  async generate(config: GenerateAudioConfig, onProgress?: JobProgressHandler): Promise<Job> {
    const voice = db.voices.find((v) => v.id === config.voiceId);
    const job = await runJob(
      'generate_audio',
      [
        { label: 'Preparing script', ms: 800, engine: 'lfm2.5' },
        { label: 'Processing voice', ms: 1200, engine: voice?.engine },
        { label: 'Generating speech', ms: 2500, engine: 'pocket_tts' },
        { label: 'Finalizing audio', ms: 800, engine: 'audio_cpp' },
      ],
      { projectId: config.projectId, onProgress },
    );

    const words = config.script.trim().split(/\s+/).length;
    const item: AudioGeneration = {
      id: generateId('aud'),
      projectId: config.projectId,
      voiceId: config.voiceId,
      voiceName: voice?.name ?? 'Voice',
      script: config.script,
      duration: Math.max(8, Math.round(words / 2.4)),
      engine: voice?.engine,
      status: 'done',
      sourceIds: config.sourceIds,
      createdAt: now(),
    };
    db.audio.push(item);
    return job;
  },

  async regenerate(id: string, onProgress?: JobProgressHandler): Promise<Job> {
    const item = db.audio.find((a) => a.id === id);
    if (!item) throw new Error('We could not find that audio.');
    item.status = 'running';
    const job = await this.generate(
      {
        projectId: item.projectId,
        voiceId: item.voiceId,
        script: item.script,
        sourceIds: item.sourceIds,
      },
      onProgress,
    );
    db.audio = db.audio.filter((a) => a.id !== id);
    return job;
  },

  async delete(id: string): Promise<void> {
    await delay(350);
    db.audio = db.audio.filter((a) => a.id !== id);
  },
};
