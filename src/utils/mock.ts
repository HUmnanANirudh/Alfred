export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const now = (): string => new Date().toISOString();

export const failWith = (probability: number): boolean => Math.random() < probability;

export function excerpt(text: string, length = 200): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= length) return trimmed;
  return `${trimmed.slice(0, length).trim()}…`;
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function youtubeIdFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.replace('/', '') || undefined;
    }
    if (parsed.hostname.includes('youtube.com')) {
      return parsed.searchParams.get('v') ?? undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
