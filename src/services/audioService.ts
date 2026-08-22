import type { AudioGeneration, GenerateAudioConfig, Job } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { runJob, type JobProgressHandler } from './jobRunner';
import { invokeCmd, isTauri, withJobProgress } from './ipc';
import { db } from './memory';

function titleFromScript(script: string, fallback = 'Untitled draft') {
  const line = script.trim().split('\n').find((part) => part.trim());
  if (!line) return fallback;
  return line.length > 48 ? `${line.slice(0, 48).trim()}…` : line.trim();
}

export const audioService = {
  async list(projectId: string): Promise<AudioGeneration[]> {
    if (isTauri()) return invokeCmd<AudioGeneration[]>('list_audio', { projectId });
    await delay(400);
    return db.audio
      .filter((a) => a.projectId === projectId)
      .slice()
      .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
      .map((a) => ({ ...a }));
  },

  async get(id: string): Promise<AudioGeneration | null> {
    if (isTauri()) return invokeCmd<AudioGeneration | null>('get_audio', { id });
    await delay(250);
    const item = db.audio.find((a) => a.id === id);
    return item ? { ...item } : null;
  },

  async generate(config: GenerateAudioConfig, onProgress?: JobProgressHandler): Promise<Job> {
    if (isTauri()) {
      return withJobProgress(() => invokeCmd<Job>('generate_audio', { config }), onProgress);
    }
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
    const stamp = now();
    const item: AudioGeneration = {
      id: generateId('aud'),
      projectId: config.projectId,
      voiceId: config.voiceId,
      voiceName: voice?.name ?? 'Voice',
      title: config.title?.trim() || titleFromScript(config.script),
      script: config.script,
      duration: Math.max(8, Math.round(words / 2.4)),
      engine: voice?.engine,
      status: 'done',
      sourceIds: config.sourceIds,
      createdAt: stamp,
      updatedAt: stamp,
    };
    db.audio.unshift(item);
    return job;
  },

  async update(
    id: string,
    updates: Partial<Pick<AudioGeneration, 'title' | 'script' | 'voiceId' | 'voiceName'>>,
  ): Promise<AudioGeneration> {
    if (isTauri()) {
      return invokeCmd<AudioGeneration>('update_audio', {
        id,
        title: updates.title,
        script: updates.script,
        voiceId: updates.voiceId,
        voiceName: updates.voiceName,
      });
    }
    await delay(350);
    const item = db.audio.find((a) => a.id === id);
    if (!item) throw new Error('We could not find that audio.');
    Object.assign(item, updates, { updatedAt: now() });
    if (updates.script) {
      const words = updates.script.trim().split(/\s+/).length;
      item.duration = Math.max(8, Math.round(words / 2.4));
      if (!updates.title) item.title = item.title || titleFromScript(updates.script);
    }
    return { ...item };
  },

  async render(id: string, voiceId: string, onProgress?: JobProgressHandler): Promise<Job> {
    if (isTauri()) {
      return withJobProgress(() => invokeCmd<Job>('render_audio', { id, voiceId }), onProgress);
    }
    const item = db.audio.find((a) => a.id === id);
    if (!item) throw new Error('We could not find that audio.');
    const voice = db.voices.find((v) => v.id === voiceId);
    item.status = 'running';
    const job = await runJob(
      'generate_audio',
      [
        { label: 'Preparing script', ms: 800, engine: 'lfm2.5' },
        { label: 'Processing voice', ms: 1200, engine: voice?.engine },
        { label: 'Generating speech', ms: 2500, engine: 'pocket_tts' },
        { label: 'Finalizing audio', ms: 800, engine: 'audio_cpp' },
      ],
      { projectId: item.projectId, onProgress },
    );
    item.voiceId = voiceId;
    item.voiceName = voice?.name ?? item.voiceName;
    item.engine = voice?.engine;
    item.status = 'done';
    item.updatedAt = now();
    return job;
  },

  async regenerate(id: string, onProgress?: JobProgressHandler): Promise<Job> {
    const item = isTauri() ? await this.get(id) : db.audio.find((a) => a.id === id);
    if (!item) throw new Error('We could not find that audio.');
    if (!isTauri()) item.status = 'running';
    const job = await this.generate(
      {
        projectId: item.projectId,
        voiceId: item.voiceId,
        title: item.title,
        script: item.script,
        sourceIds: item.sourceIds,
      },
      onProgress,
    );
    if (!isTauri()) db.audio = db.audio.filter((a) => a.id !== id);
    return job;
  },

  async delete(id: string): Promise<void> {
    if (isTauri()) return invokeCmd('delete_audio', { id });
    await delay(350);
    db.audio = db.audio.filter((a) => a.id !== id);
  },
};
