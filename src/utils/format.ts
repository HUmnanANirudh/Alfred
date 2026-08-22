/**
 * Alfred — Formatting utilities
 * Pure functions for human-readable display of dates, durations, counts, and sizes.
 * No side effects. Safe to call with any valid ISO string or number.
 */

/**
 * Format an ISO 8601 date string to a human-readable label.
 * Examples: "Today", "Yesterday", "Aug 21"
 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateOnly.getTime() === startOfToday.getTime()) return 'Today';
  if (dateOnly.getTime() === startOfYesterday.getTime()) return 'Yesterday';

  const sameYear = date.getFullYear() === now.getFullYear();
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();

  if (sameYear) return `${month} ${day}`;
  return `${month} ${day}, ${date.getFullYear()}`;
}

/**
 * Format seconds to a duration string.
 * Examples: "1:23:45" (with hours) or "04:32" (minutes only)
 */
export function formatDuration(seconds: number): string {
  const totalSeconds = Math.floor(Math.abs(seconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');

  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${mm}:${ss}`;
}

/**
 * Format a word count with comma separation and "words" label.
 * Example: 2431 -> "2,431 words"
 */
export function formatWordCount(n: number): string {
  return `${n.toLocaleString('en-US')} words`;
}

/**
 * Format a byte count to a human-readable size string.
 * Examples: "12.4 GB", "830 MB", "4.2 KB", "512 B"
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format an ISO 8601 timestamp to a relative time string.
 * Examples: "just now", "2 minutes ago", "1 hour ago", "3 days ago"
 */
export function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 30) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;

  const diffWeek = Math.floor(diffDay / 7);
  if (diffWeek < 5) return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;

  const diffMonth = Math.floor(diffDay / 30);
  if (diffMonth < 12) return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;

  const diffYear = Math.floor(diffDay / 365);
  return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
}
