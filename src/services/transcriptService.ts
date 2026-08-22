import type { Job, Transcript, TranscriptSegment } from '../types';
import { invokeCmd, withJobProgress, type JobProgressHandler } from './ipc';

export const transcriptService = {
  get: (videoId: string) => invokeCmd<Transcript | null>('get_transcript', { videoId }),
  list: (projectId: string) => invokeCmd<Transcript[]>('list_transcripts', { projectId }),
  generate: (videoId: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('generate_transcript', { videoId }), onProgress),
  updateSegment: (transcriptId: string, segment: TranscriptSegment) =>
    invokeCmd<Transcript>('update_transcript_segment', { transcriptId, segment }),
  diarize: (videoId: string, onProgress?: JobProgressHandler) =>
    withJobProgress(() => invokeCmd<Job>('diarize_transcript', { videoId }), onProgress),
};
