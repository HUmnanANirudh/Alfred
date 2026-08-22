import type { Project, ProjectStats } from '../types';
import { generateId } from '../utils/id';
import { delay, now } from '../utils/mock';
import { invokeCmd, isTauri } from './ipc';
import { computeStats, db, seedProjectLibrary } from './memory';

export const projectService = {
  async list(): Promise<Project[]> {
    if (isTauri()) return invokeCmd<Project[]>('list_projects');
    await delay(400);
    return db.projects.map((p) => ({ ...p, stats: computeStats(p.id) }));
  },

  async get(id: string): Promise<Project | null> {
    if (isTauri()) return invokeCmd<Project | null>('get_project', { id });
    await delay(250);
    const project = db.projects.find((p) => p.id === id);
    if (!project) return null;
    return { ...project, stats: computeStats(id) };
  },

  async create(name: string, description?: string): Promise<Project> {
    if (isTauri()) return invokeCmd<Project>('create_project', { name, description });
    await delay(600);
    const stamp = now();
    const project: Project = {
      id: generateId('proj'),
      name,
      description,
      createdAt: stamp,
      updatedAt: stamp,
      stats: {
        sourceCount: 0,
        videoCount: 0,
        shortCount: 0,
        transcriptCount: 0,
        draftCount: 0,
        audioCount: 0,
      },
    };
    db.projects.push(project);
    seedProjectLibrary(project.id);
    return { ...project, stats: computeStats(project.id) };
  },

  async update(
    id: string,
    updates: Partial<Pick<Project, 'name' | 'description'>>,
  ): Promise<Project> {
    if (isTauri()) {
      return invokeCmd<Project>('update_project', {
        id,
        name: updates.name,
        description: updates.description,
      });
    }
    await delay(400);
    const project = db.projects.find((p) => p.id === id);
    if (!project) throw new Error('We could not find that project.');
    Object.assign(project, updates, { updatedAt: now() });
    return { ...project, stats: computeStats(id) };
  },

  async delete(id: string): Promise<void> {
    if (isTauri()) return invokeCmd('delete_project', { id });
    await delay(400);
    db.projects = db.projects.filter((p) => p.id !== id);
    db.sources = db.sources.filter((s) => s.projectId !== id);
    db.videos = db.videos.filter((v) => v.projectId !== id);
    db.transcripts = db.transcripts.filter((t) => t.projectId !== id);
    db.shorts = db.shorts.filter((s) => s.projectId !== id);
    db.audio = db.audio.filter((a) => a.projectId !== id);
    db.writing = db.writing.filter((w) => w.projectId !== id);
  },

  async getStats(id: string): Promise<ProjectStats> {
    if (isTauri()) return invokeCmd<ProjectStats>('get_project_stats', { id });
    await delay(300);
    return computeStats(id);
  },
};
