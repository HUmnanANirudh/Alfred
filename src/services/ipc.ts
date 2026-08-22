import type { Job } from '../types';
import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export type LlmTokenEvent = { token: string };
export type JobProgressHandler = (job: Job) => void;

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export async function invokeCmd<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri()) {
    console.warn(`[Mock IPC] Command '${cmd}' called in browser. Returning empty mock data.`);
    if (cmd === 'list_projects' || cmd === 'list_sources' || cmd === 'list_writing' || cmd === 'list_audio' || cmd === 'list_voices' || cmd === 'list_videos' || cmd === 'list_transcripts' || cmd === 'list_shorts' || cmd === 'list_posts') return [] as T;
    if (cmd === 'engine_health') return { llama: true, audio: true } as T;
    return null as T;
  }
  return invoke<T>(cmd, args);
}

export async function withJobProgress<T>(
  run: () => Promise<T>,
  onProgress?: JobProgressHandler,
): Promise<T> {
  if (!onProgress || !isTauri()) return run();
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
  if (!handlers || !isTauri()) return run();
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

export async function assetUrl(path: string): Promise<string> {
  if (!isTauri()) return path;
  return convertFileSrc(path);
}
