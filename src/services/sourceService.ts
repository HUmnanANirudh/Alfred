import type { AddYouTubeResult, FetchArticleResult, Source, Video } from '../types';
import { generateId } from '../utils/id';
import { delay, excerpt, failWith, now, wordCount, youtubeIdFromUrl } from '../utils/mock';
import { db, MOCK_ARTICLE, makeMockTranscript } from './memory';

const FAIL_REASONS: Array<Extract<FetchArticleResult, { success: false }>['reason']> = [
  'extraction_failed',
  'paywall',
  'network_error',
];

function persistVideoFromYoutube(source: Source): void {
  const meta = source.metadata?.type === 'youtube' ? source.metadata : undefined;
  const video: Video = {
    id: generateId('vid'),
    projectId: source.projectId,
    sourceId: source.id,
    title: source.title,
    duration: meta?.duration,
    url: source.url,
    thumbnailPath: meta?.thumbnail,
    hasTranscript: true,
    createdAt: now(),
  };
  db.videos.push(video);
  db.transcripts.push(makeMockTranscript(source.projectId, video.id));
}

export const sourceService = {
  async list(projectId: string): Promise<Source[]> {
    await delay(400);
    return db.sources.filter((s) => s.projectId === projectId).map((s) => ({ ...s }));
  },

  async get(id: string): Promise<Source | null> {
    await delay(250);
    const source = db.sources.find((s) => s.id === id);
    return source ? { ...source } : null;
  },

  async fetchArticle(url: string): Promise<FetchArticleResult> {
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
      excerpt: 'A talk on keeping research, transcripts, and drafts on device.',
      wordCount: 420,
      content: MOCK_ARTICLE,
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
    persistVideoFromYoutube(source);
    return { success: true, source: { ...source } };
  },

  async addText(projectId: string, title: string, content: string): Promise<Source> {
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
    await delay(600);
    const created: Source = {
      ...source,
      id: generateId('src'),
      createdAt: now(),
      excerpt: source.excerpt ?? (source.content ? excerpt(source.content) : undefined),
      wordCount: source.wordCount ?? (source.content ? wordCount(source.content) : undefined),
    };
    db.sources.push(created);
    if (created.type === 'youtube') persistVideoFromYoutube(created);
    if (created.type === 'video') {
      const video: Video = {
        id: generateId('vid'),
        projectId: created.projectId,
        sourceId: created.id,
        title: created.title,
        duration: created.metadata?.type === 'video' ? created.metadata.duration : 180,
        filePath: created.metadata?.type === 'video' ? created.metadata.filePath : undefined,
        hasTranscript: true,
        createdAt: now(),
      };
      db.videos.push(video);
      db.transcripts.push(makeMockTranscript(created.projectId, video.id));
    }
    return { ...created };
  },

  async update(id: string, updates: Partial<Source>): Promise<Source> {
    await delay(400);
    const source = db.sources.find((s) => s.id === id);
    if (!source) throw new Error('We could not find that source.');
    Object.assign(source, updates);
    return { ...source };
  },

  async delete(id: string): Promise<void> {
    await delay(400);
    db.sources = db.sources.filter((s) => s.id !== id);
  },
};
