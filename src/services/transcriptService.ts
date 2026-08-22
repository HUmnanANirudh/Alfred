import type { Job, Transcript } from '../types';
import { delay } from '../utils/mock';
import { runJob, type JobProgressHandler } from './jobRunner';
import { invokeCmd, isTauri, withJobProgress } from './ipc';
import { db, makeMockTranscript } from './memory';

export const transcriptService = {
  async get(videoId: string): Promise<Transcript | null> {
    if (isTauri()) return invokeCmd<Transcript | null>('get_transcript', { videoId });
    await delay(300);
    const transcript = db.transcripts.find((t) => t.videoId === videoId);
    return transcript ? { ...transcript, segments: [...transcript.segments] } : null;
  },

  async list(projectId: string): Promise<Transcript[]> {
    if (isTauri()) return invokeCmd<Transcript[]>('list_transcripts', { projectId });
    await delay(400);
    return db.transcripts
      .filter((t) => t.projectId === projectId)
      .map((t) => ({ ...t, segments: [...t.segments] }));
  },

  async generate(videoId: string, onProgress?: JobProgressHandler): Promise<Job> {
    if (isTauri()) {
      return withJobProgress(() => invokeCmd<Job>('generate_transcript', { videoId }), onProgress);
    }
    const video = db.videos.find((v) => v.id === videoId);
    const job = await runJob(
      'generate_transcript',
      [
        { label: 'Reading audio', ms: 900, engine: 'audio_cpp' },
        { label: 'Transcribing speech', ms: 1800, engine: 'qwen3_asr' },
        { label: 'Aligning words', ms: 1100, engine: 'qwen3_forced_aligner' },
      ],
      { projectId: video?.projectId, onProgress },
    );
    if (video && !db.transcripts.some((t) => t.videoId === videoId)) {
      db.transcripts.push(makeMockTranscript(video.projectId, videoId));
      video.hasTranscript = true;
    }
    return job;
  },
};
