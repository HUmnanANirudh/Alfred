import { Link } from 'react-router-dom';
import type { Source } from '../../types';
import { formatDate, formatWordCount } from '../../utils/format';
import styles from './SourceCard.module.css';

export function SourceCard({ source, to }: { source: Source; to: string }) {
  return (
    <Link to={to} className={styles.card}>
      <div className={styles.top}>
        <span className={styles.type}>{source.type}</span>
        <span className={styles.date}>{formatDate(source.createdAt)}</span>
      </div>
      <h3 className={styles.title}>{source.title}</h3>
      {source.excerpt && <p className={styles.excerpt}>{source.excerpt}</p>}
      <p className={styles.meta}>
        {source.wordCount ? formatWordCount(source.wordCount) : 'No text yet'}
        {source.url ? ` · ${source.url}` : ''}
      </p>
    </Link>
  );
}
