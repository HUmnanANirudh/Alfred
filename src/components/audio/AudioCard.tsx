import type { AudioGeneration } from '../../types';
import { formatDate, formatDuration } from '../../utils/format';
import styles from './AudioCard.module.css';

export function AudioCard({ item }: { item: AudioGeneration }) {
  return (
    <article className={styles.card}>
      <div className={styles.wave} aria-hidden>
        {Array.from({ length: 32 }).map((_, i) => (
          <span key={i} style={{ height: `${20 + ((i * 17) % 70)}%` }} />
        ))}
      </div>
      <div>
        <h3 className={styles.title}>{item.voiceName}</h3>
        <p className={styles.script}>{item.script}</p>
        <p className={styles.meta}>
          {item.duration != null ? formatDuration(item.duration) : '—'} · {formatDate(item.createdAt)}
        </p>
      </div>
    </article>
  );
}
