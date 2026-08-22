import type {
  GenerateArticleConfig,
  GenerateSocialConfig,
  SocialPost,
  WritingOutput,
} from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { db, MOCK_ARTICLE } from './memory';

function save(output: WritingOutput, posts?: SocialPost[]): WritingOutput {
  db.writing.push(output);
  if (posts) db.socialPosts.push(...posts);
  return { ...output };
}

const X_POSTS = [
  'Keep the research in one project. Reuse it for shorts, threads, and the long piece — without another paste.',
  'Local inference is a product decision, not a slogan. Transcripts and voice samples stay on the desk.',
  'A 350M model is enough when the job is JSON: hooks, clip windows, five posts. Narrow beats chatty.',
  'The clip that travels is a concrete claim. Cut the throat-clearing.',
  'Captions are how most people watch. Design the short for silence.',
];

const THREAD = [
  '1/ If you are still pasting the same notes into five AI tools, the workflow is the product problem.',
  '2/ One project. One source library. Articles, YouTube, local files, pasted research — in once.',
  '3/ Video, audio, and writing all read from that library. No re-briefing the model.',
  '4/ Inference stays on device. That is how unpublished interviews and client briefs can live here.',
  '5/ Small models, structured jobs. Ask for JSON. Validate it. Retry if it is malformed.',
  '6/ Shorts come from timestamps, not vibes. Transcript + visual score + hook line.',
  '7/ That is Alfred: butler work for creators who want the material to stay theirs.',
];

const LINKEDIN = `Most creator stacks leak context.

You research once, then re-paste it into a chatbot, a caption tool, and a doc. Each hop drops citations and privacy.

A better shape is a local project: sources in the middle, formats on the edges. Generate the article, the thread, and the short from the same notes.

The constraint is architectural. If transcripts and voice clones never leave the machine, you can work from material you would not upload.

That is the workspace I want: calm, desktop-native, and quiet about the cloud.`;

export const writingService = {
  async list(projectId: string): Promise<WritingOutput[]> {
    await delay(400);
    return db.writing.filter((w) => w.projectId === projectId).map((w) => ({ ...w }));
  },

  async get(id: string): Promise<WritingOutput | null> {
    await delay(250);
    const item = db.writing.find((w) => w.id === id);
    return item ? { ...item } : null;
  },

  async listPosts(outputId: string): Promise<SocialPost[]> {
    await delay(150);
    return db.socialPosts.filter((p) => p.outputId === outputId).map((p) => ({ ...p }));
  },

  async generateArticle(config: GenerateArticleConfig): Promise<WritingOutput> {
    await delay(2000);
    const title = config.title?.trim() || config.topic.trim() || 'Draft from project sources';
    return save({
      id: generateId('wrt'),
      projectId: config.projectId,
      type: 'article',
      title,
      content: `# ${title}\n\n${MOCK_ARTICLE}`,
      sourceIds: config.sourceIds,
      tone: config.tone,
      model: 'lfm2.5-350m-q4_k_m',
      status: 'done',
      createdAt: now(),
    });
  },

  async generateXPost(config: GenerateSocialConfig): Promise<WritingOutput> {
    await delay(1500);
    const content = X_POSTS[0] ?? '';
    const output = save({
      id: generateId('wrt'),
      projectId: config.projectId,
      type: 'x_post',
      content,
      sourceIds: config.sourceIds,
      tone: config.tone,
      model: 'lfm2.5-350m-q4_k_m',
      status: 'done',
      createdAt: now(),
    });
    db.socialPosts.push({
      id: generateId('pst'),
      outputId: output.id,
      index: 1,
      content,
    });
    return output;
  },

  async generateThread(config: GenerateSocialConfig): Promise<WritingOutput> {
    await delay(2000);
    const posts = THREAD.slice(0, config.postCount ?? THREAD.length);
    const output = save({
      id: generateId('wrt'),
      projectId: config.projectId,
      type: 'thread',
      content: posts.join('\n\n'),
      sourceIds: config.sourceIds,
      tone: config.tone,
      model: 'lfm2.5-350m-q4_k_m',
      status: 'done',
      createdAt: now(),
    });
    posts.forEach((content, i) => {
      db.socialPosts.push({
        id: generateId('pst'),
        outputId: output.id,
        index: i + 1,
        content,
      });
    });
    return output;
  },

  async generateLinkedIn(config: GenerateSocialConfig): Promise<WritingOutput> {
    await delay(1500);
    return save({
      id: generateId('wrt'),
      projectId: config.projectId,
      type: 'linkedin',
      title: 'A local workspace for research-backed content',
      content: LINKEDIN,
      sourceIds: config.sourceIds,
      tone: config.tone,
      model: 'lfm2.5-350m-q4_k_m',
      status: 'done',
      createdAt: now(),
    });
  },

  async update(id: string, content: string): Promise<WritingOutput> {
    await delay(400);
    const item = db.writing.find((w) => w.id === id);
    if (!item) throw new Error('We could not find that draft.');
    item.content = content;
    return { ...item };
  },

  async updatePost(id: string, content: string): Promise<SocialPost> {
    await delay(250);
    const post = db.socialPosts.find((p) => p.id === id);
    if (!post) throw new Error('We could not find that post.');
    post.content = content;
    const parent = db.writing.find((w) => w.id === post.outputId);
    if (parent) {
      parent.content = db.socialPosts
        .filter((p) => p.outputId === parent.id)
        .sort((a, b) => a.index - b.index)
        .map((p) => p.content)
        .join('\n\n');
    }
    return { ...post };
  },

  async delete(id: string): Promise<void> {
    await delay(350);
    db.writing = db.writing.filter((w) => w.id !== id);
    db.socialPosts = db.socialPosts.filter((p) => p.outputId !== id);
  },
};
