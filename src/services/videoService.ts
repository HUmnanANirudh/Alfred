import type { Video } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { invokeCmd, isTauri } from './ipc';
import { db, makeMockTranscript } from './memory';

export const videoService = {
  async list(projectId: string): Promise<Video[]> {
    if (isTauri()) return invokeCmd<Video[]>('list_videos', { projectId });
    await delay(400);
    return db.videos.filter((v) => v.projectId === projectId).map((v) => ({ ...v }));
  },

  async get(id: string): Promise<Video | null> {
    if (isTauri()) return invokeCmd<Video | null>('get_video', { id });
    await delay(250);
    const video = db.videos.find((v) => v.id === id);
    return video ? { ...video } : null;
  },

  async addFromSource(projectId: string, sourceId: string): Promise<Video> {
    if (isTauri()) return invokeCmd<Video>('add_video_from_source', { projectId, sourceId });
    await delay(800);
    const source = db.sources.find((s) => s.id === sourceId);
    const video: Video = {
      id: generateId('vid'),
      projectId,
      sourceId,
      title: source?.title ?? 'Untitled video',
      url: source?.url,
      duration: 240,
      hasTranscript: true,
      createdAt: now(),
    };
    db.videos.push(video);
    db.transcripts.push(makeMockTranscript(projectId, video.id));
    return { ...video };
  },

  async addFromUrl(projectId: string, url: string): Promise<Video> {
    if (isTauri()) return invokeCmd<Video>('add_video_from_url', { projectId, url });
    await delay(2500);
    const video: Video = {
      id: generateId('vid'),
      projectId,
      title: 'Imported video',
      url,
      duration: 615,
      hasTranscript: true,
      createdAt: now(),
    };
    db.videos.push(video);
    db.transcripts.push(makeMockTranscript(projectId, video.id));
    return { ...video };
  },

  async addFromLocal(projectId: string, filePath: string): Promise<Video> {
    if (isTauri()) return invokeCmd<Video>('add_video_from_local', { projectId, filePath });
    await delay(1500);
    const name = filePath.split(/[/\\]/).pop() ?? 'Local video';
    const video: Video = {
      id: generateId('vid'),
      projectId,
      title: name,
      filePath,
      duration: 198,
      hasTranscript: true,
      createdAt: now(),
    };
    db.videos.push(video);
    db.transcripts.push(makeMockTranscript(projectId, video.id));
    return { ...video };
  },

  async delete(id: string): Promise<void> {
    if (isTauri()) return invokeCmd('delete_video', { id });
    await delay(400);
    db.videos = db.videos.filter((v) => v.id !== id);
    db.transcripts = db.transcripts.filter((t) => t.videoId !== id);
    db.shorts = db.shorts.filter((s) => s.videoId !== id);
  },
};
