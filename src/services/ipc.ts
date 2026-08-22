import type { Job } from '../types';

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function withJobProgress<T>(
  run: () => Promise<T>,
  onProgress?: (job: Job) => void,
): Promise<T> {
  if (!isTauri() || !onProgress) return run();
  const { listen } = await import('@tauri-apps/api/event');
  const unlisten = await listen<Job>('job:progress', (event) => {
    onProgress(event.payload);
  });
  try {
    return await run();
  } finally {
    unlisten();
  }
}
