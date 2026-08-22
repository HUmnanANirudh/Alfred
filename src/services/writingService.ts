import type {
  GenerateArticleConfig,
  GenerateSocialConfig,
  SocialPost,
  WritingOutput,
} from '../types';
import { invokeCmd, withLlmTokens } from './ipc';

export type WritingStreamHandlers = {
  onStart?: () => void;
  onToken?: (token: string) => void;
};

export const writingService = {
  list: (projectId: string) => invokeCmd<WritingOutput[]>('list_writing', { projectId }),
  get: (id: string) => invokeCmd<WritingOutput | null>('get_writing', { id }),
  listPosts: (outputId: string) => invokeCmd<SocialPost[]>('list_posts', { outputId }),
  generateArticle: (config: GenerateArticleConfig, stream?: WritingStreamHandlers) =>
    withLlmTokens(() => invokeCmd<WritingOutput>('generate_article', { config }), stream),
  generateXPost: (config: GenerateSocialConfig, stream?: WritingStreamHandlers) =>
    withLlmTokens(() => invokeCmd<WritingOutput>('generate_x_post', { config }), stream),
  generateThread: (config: GenerateSocialConfig, stream?: WritingStreamHandlers) =>
    withLlmTokens(() => invokeCmd<WritingOutput>('generate_thread', { config }), stream),
  generateLinkedIn: (config: GenerateSocialConfig, stream?: WritingStreamHandlers) =>
    withLlmTokens(() => invokeCmd<WritingOutput>('generate_linkedin', { config }), stream),
  rewrite: (
    id: string,
    action: 'rewrite' | 'expand' | 'shorten',
    selection?: string,
    tone?: string,
    stream?: WritingStreamHandlers,
  ) =>
    withLlmTokens(
      () => invokeCmd<WritingOutput>('rewrite_writing', { id, action, selection, tone }),
      stream,
    ),
  update: (id: string, content: string) => invokeCmd<WritingOutput>('update_writing', { id, content }),
  updatePost: (id: string, content: string) => invokeCmd<SocialPost>('update_post', { id, content }),
  delete: (id: string) => invokeCmd<void>('delete_writing', { id }),
  exportFile: (id: string, format: 'md' | 'txt') => invokeCmd<string>('export_writing', { id, format }),
};
