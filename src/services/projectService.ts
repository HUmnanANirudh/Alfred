import type { Project, ProjectStats } from '../types';
import { invokeCmd } from './ipc';

export const projectService = {
  list: () => invokeCmd<Project[]>('list_projects'),
  get: (id: string) => invokeCmd<Project | null>('get_project', { id }),
  create: (name: string, description?: string) =>
    invokeCmd<Project>('create_project', { name, description }),
  update: (id: string, updates: Partial<Pick<Project, 'name' | 'description'>>) =>
    invokeCmd<Project>('update_project', {
      id,
      name: updates.name,
      description: updates.description,
    }),
  delete: (id: string) => invokeCmd<void>('delete_project', { id }),
  getStats: (id: string) => invokeCmd<ProjectStats>('get_project_stats', { id }),
};
