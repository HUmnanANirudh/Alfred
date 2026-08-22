import type { AIModel, EngineHealth, Job, StorageUsage } from '../types';
import { invokeCmd, withJobProgress } from './ipc';

export const modelService = {
  list: () => invokeCmd<AIModel[]>('list_models'),
  install: (modelId: string) =>
    withJobProgress(() => invokeCmd<Job>('install_model', { modelId })),
  uninstall: (modelId: string) => invokeCmd<void>('uninstall_model', { modelId }),
  getStorageUsage: () => invokeCmd<StorageUsage>('get_storage_usage'),
  engineHealth: () => invokeCmd<EngineHealth>('engine_health'),
};
