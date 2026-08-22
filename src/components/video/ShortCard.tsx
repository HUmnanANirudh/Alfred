import type { Short } from '../../types';
import { formatDuration } from '../../utils/format';
import { Badge } from '../ui/Badge';
import styles from './ShortCard.module.css';

export function ShortCard({ short }: { short: Short }) {
  const pct = Math.round((short.confidence ?? 0) * 100);
  return (
    <article className={styles.card}>
      <div className={styles.thumb} aria-hidden />
      <div className={styles.body}>
        <h3 className={styles.title}>{short.title ?? 'Short'}</h3>
        {short.hook && <p className={styles.hook}>{short.hook}</p>}
        <div className={styles.meta}>
          {short.duration != null && <span>{formatDuration(short.duration)}</span>}
          <Badge variant="accent">{pct}% confidence</Badge>
        </div>
      </div>
    </article>
  );
}
