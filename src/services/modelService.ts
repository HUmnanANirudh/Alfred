import type { AIModel, Job, StorageUsage } from '../types';
import { delay, now } from '../utils/mock';
import { runJob } from './jobRunner';
import { db } from './memory';

export const modelService = {
  async list(): Promise<AIModel[]> {
    await delay(300);
    return db.models.map((m) => ({ ...m }));
  },

  async install(modelId: string): Promise<Job> {
    const model = db.models.find((m) => m.id === modelId);
    if (model) model.status = 'downloading';
    const job = await runJob('clone_voice', [
      { label: 'Fetching package', ms: 900 },
      { label: 'Writing files', ms: 1400 },
      { label: 'Verifying', ms: 600 },
    ]);
    if (model) {
      model.status = 'ready';
      model.installedAt = now();
    }
    return job;
  },

  async uninstall(modelId: string): Promise<void> {
    await delay(400);
    const model = db.models.find((m) => m.id === modelId);
    if (model) {
      model.status = 'not_installed';
      model.installedAt = undefined;
    }
  },

  async getStorageUsage(): Promise<StorageUsage> {
    await delay(250);
    return {
      projects: 48_300_000,
      models: 1_240_000_000,
      exports: 12_400_000,
    };
  },
};
