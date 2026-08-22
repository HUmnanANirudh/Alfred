import type { Job, Voice } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { runJob, type JobProgressHandler } from './jobRunner';
import { db } from './memory';

export const voiceService = {
  async list(): Promise<Voice[]> {
    await delay(350);
    return db.voices.map((v) => ({ ...v }));
  },

  async get(id: string): Promise<Voice | null> {
    await delay(200);
    const voice = db.voices.find((v) => v.id === id);
    return voice ? { ...voice } : null;
  },

  async create(name: string, samplePath?: string, onProgress?: JobProgressHandler): Promise<Job> {
    const job = await runJob(
      'clone_voice',
      [
        { label: 'Reading sample', ms: 900, engine: 'audio_cpp' },
        { label: 'Building voice', ms: 1800, engine: 'chatterbox' },
        { label: 'Saving on device', ms: 700 },
      ],
      { onProgress },
    );
    db.voices.push({
      id: generateId('vce'),
      name,
      samplePath,
      engine: 'chatterbox',
      isCloned: true,
      createdAt: now(),
    });
    return job;
  },

  async delete(id: string): Promise<void> {
    await delay(350);
    db.voices = db.voices.filter((v) => v.id !== id);
  },

  async preview(_id: string): Promise<string> {
    await delay(400);
    return '/tauri.svg';
  },
};
