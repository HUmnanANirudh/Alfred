import type { Job, Voice } from '../types';
import { invokeCmd, withJobProgress, type JobProgressHandler } from './ipc';

export const voiceService = {
  list: () => invokeCmd<Voice[]>('list_voices'),
  get: (id: string) => invokeCmd<Voice | null>('get_voice', { id }),
  create: (name: string, samplePath?: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('create_voice', { name, samplePath }), onProgress),
  delete: (id: string) => invokeCmd<void>('delete_voice', { id }),
  preview: (id: string) => invokeCmd<string>('preview_voice', { id }),
};
