import { FileText, Film, Play, Type } from 'lucide-react';
import type { SourceType } from '../../types';
import styles from './SourceIcon.module.css';

const MAP: Record<SourceType, { icon: typeof FileText; className: string }> = {
  article: { icon: FileText, className: styles.article },
  youtube: { icon: Play, className: styles.youtube },
  video: { icon: Film, className: styles.video },
  text: { icon: Type, className: styles.text },
};

export function SourceIcon({ type, size = 16 }: { type: SourceType; size?: number }) {
  const entry = MAP[type];
  const Icon = entry.icon;
  return (
    <span className={`${styles.wrap} ${entry.className}`}>
      <Icon size={size} />
    </span>
  );
}
