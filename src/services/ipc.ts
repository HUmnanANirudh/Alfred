import type { Job } from '../types';

export type LlmTokenEvent = { token: string };

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

export async function withLlmTokens<T>(
  run: () => Promise<T>,
  handlers?: { onStart?: () => void; onToken?: (token: string) => void },
): Promise<T> {
  if (!isTauri() || !handlers) return run();
  const { listen } = await import('@tauri-apps/api/event');
  const unstart = await listen('llm:start', () => handlers.onStart?.());
  const untok = await listen<LlmTokenEvent>('llm:token', (event) => {
    handlers.onToken?.(event.payload.token);
  });
  try {
    return await run();
  } finally {
    unstart();
    untok();
  }
}
