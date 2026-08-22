import type { AddYouTubeResult, FetchArticleResult, Source, Video } from '../types';
import { generateId } from '../utils/id';
import { delay, excerpt, failWith, now, wordCount, youtubeIdFromUrl } from '../utils/mock';
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
  source.content = body;
  source.excerpt = excerpt(body);
  source.wordCount = wordCount(body);
  db.videos.push(video);
  db.transcripts.push(transcript);
  return video;
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
    if (created.type === 'youtube' || created.type === 'video') {
      persistVideoFromSource(created);
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
