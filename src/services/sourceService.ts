import type { AddYouTubeResult, FetchArticleResult, Source } from '../types';
import { invokeCmd } from './ipc';

export const sourceService = {
  list: (projectId: string) => invokeCmd<Source[]>('list_sources', { projectId }),
  get: (id: string) => invokeCmd<Source | null>('get_source', { id }),
  fetchArticle: (url: string) => invokeCmd<FetchArticleResult>('fetch_article', { url }),
  addYouTube: (projectId: string, url: string) =>
    invokeCmd<AddYouTubeResult>('add_youtube', { projectId, url }),
  addText: (projectId: string, title: string, content: string) =>
    invokeCmd<Source>('add_text', { projectId, title, content }),
  add: (source: Omit<Source, 'id' | 'createdAt'>) => invokeCmd<Source>('add_source', { source }),
  addRss: (projectId: string, url: string) => invokeCmd<Source[]>('add_rss', { projectId, url }),
  addPdf: (projectId: string, filePath: string) =>
    invokeCmd<Source>('add_pdf', { projectId, filePath }),
  addEpub: (projectId: string, filePath: string) =>
    invokeCmd<Source>('add_epub', { projectId, filePath }),
  update: (id: string, updates: Partial<Source>) =>
    invokeCmd<Source>('update_source', { id, title: updates.title, content: updates.content }),
  delete: (id: string) => invokeCmd<void>('delete_source', { id }),
};
