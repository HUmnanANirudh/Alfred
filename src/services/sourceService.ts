import type { AddYouTubeResult, FetchArticleResult, Source, Video } from '../types';
import { generateId } from '../utils/id';
import { delay, excerpt, failWith, now, wordCount, youtubeIdFromUrl } from '../utils/mock';
import { invokeCmd, isTauri } from './ipc';
import { db, MOCK_ARTICLE, makeMockTranscript } from './memory';

const FAIL_REASONS: Array<Extract<FetchArticleResult, { success: false }>['reason']> = [
  'extraction_failed',
  'paywall',
  'network_error',
];

function persistVideoFromSource(source: Source): Video {
  const yt = source.metadata?.type === 'youtube' ? source.metadata : undefined;
  const local = source.metadata?.type === 'video' ? source.metadata : undefined;
  const video: Video = {
    id: generateId('vid'),
    projectId: source.projectId,
    sourceId: source.id,
    title: source.title,
    duration: yt?.duration ?? local?.duration,
    url: source.url,
    thumbnailPath: yt?.thumbnail,
    filePath: local?.filePath,
    hasTranscript: true,
    createdAt: now(),
  };
  const transcript = makeMockTranscript(source.projectId, video.id);
  const body = transcript.segments.map((s) => s.text).join('\n\n');
  const transcriptSource: Source = {
    id: generateId('src'),
    projectId: source.projectId,
    type: 'transcript',
    title: source.title,
    content: body,
    excerpt: excerpt(body),
    wordCount: wordCount(body),
    metadata: { type: 'transcript', videoSourceId: source.id, videoId: video.id },
    createdAt: now(),
  };
  db.videos.push(video);
  db.transcripts.push(transcript);
  db.sources.push(transcriptSource);
  return video;
}

export const sourceService = {
  async list(projectId: string): Promise<Source[]> {
    if (isTauri()) return invokeCmd<Source[]>('list_sources', { projectId });
    await delay(400);
    return db.sources.filter((s) => s.projectId === projectId).map((s) => ({ ...s }));
  },

  async get(id: string): Promise<Source | null> {
    if (isTauri()) return invokeCmd<Source | null>('get_source', { id });
    await delay(250);
    const source = db.sources.find((s) => s.id === id);
    return source ? { ...source } : null;
  },

  async fetchArticle(url: string): Promise<FetchArticleResult> {
    if (isTauri()) return invokeCmd<FetchArticleResult>('fetch_article', { url });
    await delay(1800);
    if (failWith(0.2)) {
      const reason = FAIL_REASONS[Math.floor(Math.random() * FAIL_REASONS.length)] ?? 'extraction_failed';
      return { success: false, reason };
    }
    let domain: string | undefined;
    try {
      domain = new URL(url).hostname.replace(/^www\./, '');
    } catch {
      domain = undefined;
    }
    return {
      success: true,
      data: {
        title: domain ? `Notes from ${domain}` : 'Extracted article',
        content: MOCK_ARTICLE,
        wordCount: wordCount(MOCK_ARTICLE),
        excerpt: excerpt(MOCK_ARTICLE),
        url,
        type: 'article',
        metadata: { type: 'article', domain, author: 'Unknown', publishedAt: now() },
      },
    };
  },

  async addYouTube(projectId: string, url: string): Promise<AddYouTubeResult> {
    if (isTauri()) return invokeCmd<AddYouTubeResult>('add_youtube', { projectId, url });
    await delay(2200);
    const videoId = youtubeIdFromUrl(url);
    if (!videoId) {
      return { success: false, reason: 'invalid_url' };
    }
    const title = 'Working locally with research';
    const source: Source = {
      id: generateId('src'),
      projectId,
      type: 'youtube',
      title,
      url,
      excerpt: '',
      wordCount: 0,
      content: '',
      metadata: {
        type: 'youtube',
        videoId,
        channelName: 'Studio Notes',
        duration: 742,
        views: 12840,
      },
      createdAt: now(),
    };
    db.sources.push(source);
    persistVideoFromSource(source);
    return { success: true, source: { ...source } };
  },

  async addText(projectId: string, title: string, content: string): Promise<Source> {
    if (isTauri()) return invokeCmd<Source>('add_text', { projectId, title, content });
    await delay(500);
    const source: Source = {
      id: generateId('src'),
      projectId,
      type: 'text',
      title,
      content,
      excerpt: excerpt(content),
      wordCount: wordCount(content),
      metadata: { type: 'text' },
      createdAt: now(),
    };
    db.sources.push(source);
    return { ...source };
  },

  async add(source: Omit<Source, 'id' | 'createdAt'>): Promise<Source> {
    if (isTauri()) return invokeCmd<Source>('add_source', { source });
    await delay(600);
    const created: Source = {
      ...source,
      id: generateId('src'),
      createdAt: now(),
      excerpt: source.excerpt ?? (source.content ? excerpt(source.content) : undefined),
      wordCount: source.wordCount ?? (source.content ? wordCount(source.content) : undefined),
    };
    db.sources.push(created);
    if (created.type === 'youtube' || created.type === 'video') {
      persistVideoFromSource(created);
    }
    return { ...created };
  },

  async update(id: string, updates: Partial<Source>): Promise<Source> {
    if (isTauri()) {
      return invokeCmd<Source>('update_source', {
        id,
        title: updates.title,
        content: updates.content,
      });
    }
    await delay(400);
    const source = db.sources.find((s) => s.id === id);
    if (!source) throw new Error('We could not find that source.');
    Object.assign(source, updates);
    return { ...source };
  },

  async delete(id: string): Promise<void> {
    if (isTauri()) return invokeCmd('delete_source', { id });
    await delay(400);
    const source = db.sources.find((s) => s.id === id);
    db.sources = db.sources.filter((s) => s.id !== id);
    if (source && (source.type === 'youtube' || source.type === 'video')) {
      db.sources = db.sources.filter(
        (s) => !(s.metadata?.type === 'transcript' && s.metadata.videoSourceId === id),
      );
      const video = db.videos.find((v) => v.sourceId === id);
      if (video) {
        db.videos = db.videos.filter((v) => v.id !== video.id);
        db.transcripts = db.transcripts.filter((t) => t.videoId !== video.id);
      }
    }
  },
};
