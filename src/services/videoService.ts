import type { Video } from '../types';
import { invokeCmd } from './ipc';

export const videoService = {
  list: (projectId: string) => invokeCmd<Video[]>('list_videos', { projectId }),
  get: (id: string) => invokeCmd<Video | null>('get_video', { id }),
  addFromSource: (projectId: string, sourceId: string) =>
    invokeCmd<Video>('add_video_from_source', { projectId, sourceId }),
  addFromUrl: (projectId: string, url: string) =>
    invokeCmd<Video>('add_video_from_url', { projectId, url }),
  addFromLocal: (projectId: string, filePath: string) =>
    invokeCmd<Video>('add_video_from_local', { projectId, filePath }),
  delete: (id: string) => invokeCmd<void>('delete_video', { id }),
};
