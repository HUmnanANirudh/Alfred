import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { Short } from '../../types';
import { formatDuration } from '../../utils/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { assetUrl } from '../../services/ipc';
import { shortService } from '../../services/shortService';
import styles from './ShortCard.module.css';

export function ShortCard({ short, onDelete }: { short: Short, onDelete?: () => void }) {
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  useEffect(() => {
    if (short.filePath) {
      assetUrl(short.filePath).then(url => {
        if (url) setVideoUrl(url);
      }).catch(console.error);
    }
  }, [short.filePath]);

  const pct = Math.round((short.confidence ?? 0) * 100);
  return (
    <article className={styles.card}>
      <div className={styles.videoContainer}>
        {videoUrl ? (
          <video 
            src={videoUrl} 
            controls 
            playsInline 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />
        ) : (
          <div className={styles.thumb} aria-hidden />
        )}
      </div>
      <div className={styles.body}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className={styles.title}>{short.title ?? 'Short'}</h3>
          <Button variant="ghost" onClick={async () => {
            await shortService.delete(short.id);
            onDelete?.();
          }}>
            <Trash2 size={16} />
          </Button>
        </div>
        {short.hook && <p className={styles.hook}>{short.hook}</p>}
        <div className={styles.meta}>
          {short.duration != null && <span>{formatDuration(short.duration)}</span>}
          <Badge variant="accent">{pct}% confidence</Badge>
        </div>
      </div>
    </article>
  );
}
