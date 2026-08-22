import type { CreateShortConfig, Job, Short, VideoPreset } from '../types';
import { invokeCmd, withJobProgress, type JobProgressHandler } from './ipc';

export const shortService = {
  list: (projectId: string) => invokeCmd<Short[]>('list_shorts', { projectId }),
  get: (id: string) => invokeCmd<Short | null>('get_short', { id }),
  getPresets: () => invokeCmd<VideoPreset[]>('get_presets'),
  create: (config: CreateShortConfig, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('create_shorts', { config }), onProgress),
  regenerate: (id: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('regenerate_short', { id }), onProgress),
  delete: (id: string) => invokeCmd<void>('delete_short', { id }),
  exportFile: (id: string) => invokeCmd<string>('export_short', { id }),
  savePreset: (preset: Omit<VideoPreset, 'id'>) => invokeCmd<VideoPreset>('save_preset', { preset }),
};
