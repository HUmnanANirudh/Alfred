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
    throw new Error(`Desktop runtime required for '${cmd}'.`);
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

let _serverUrl: string | null = null;

async function getFileServerUrl(): Promise<string> {
  if (_serverUrl) return _serverUrl;
  try {
    _serverUrl = await invoke<string>('get_file_server_url');
  } catch {
    // ignore
  }
  return _serverUrl ?? '';
}

export async function assetUrl(path: string): Promise<string> {
  if (!isTauri()) return path;
  // Local HTTP file server — works on all platforms including Linux GTK
  const serverUrl = await getFileServerUrl();
  if (serverUrl) {
    return `${serverUrl}/${encodeURIComponent(path)}`;
  }
  // Fallback: try asset protocol (works on macOS/Windows)
  try {
    return convertFileSrc(path);
  } catch {
    return '';
  }
}
