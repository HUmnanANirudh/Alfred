import type { AudioGeneration, GenerateAudioConfig, GeneratePodcastConfig, Job } from '../types';
import { invokeCmd, withJobProgress, type JobProgressHandler } from './ipc';

export const audioService = {
  list: (projectId: string) => invokeCmd<AudioGeneration[]>('list_audio', { projectId }),
  get: (id: string) => invokeCmd<AudioGeneration | null>('get_audio', { id }),
  generate: (config: GenerateAudioConfig, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('generate_audio', { config }), onProgress),
  update: (
    id: string,
    updates: Partial<Pick<AudioGeneration, 'title' | 'script' | 'voiceId' | 'voiceName'>>,
  ) =>
    invokeCmd<AudioGeneration>('update_audio', {
      id,
      title: updates.title,
      script: updates.script,
      voiceId: updates.voiceId,
      voiceName: updates.voiceName,
    }),
  render: (id: string, voiceId: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('render_audio', { id, voiceId }), onProgress),
  regenerate: (id: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('regenerate_audio', { id }), onProgress),
  delete: (id: string) => invokeCmd<void>('delete_audio', { id }),
  exportFile: (id: string, format: 'wav' | 'mp3') =>
    invokeCmd<string>('export_audio', { id, format }),
  separate: (id: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('separate_audio', { id }), onProgress),
  generatePodcast: (config: GeneratePodcastConfig, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('generate_podcast', { config }), onProgress),
  previewTts: (voiceId: string, script: string) =>
    invokeCmd<string>('preview_tts', { voiceId, script }),
};
