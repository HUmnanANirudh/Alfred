import { useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDuration } from '../utils/format';
import styles from './page.module.css';

export function TranscriptDetailPage() {
  const { trsId } = useParams<{ trsId: string }>();
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const videos = useWorkspaceStore((s) => s.videos);
  const transcript = transcripts.find((t) => t.videoId === trsId || t.id === trsId);
  const video = videos.find((v) => v.id === transcript?.videoId);

  if (!transcript) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>We couldn&apos;t find that transcript.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={video?.title ?? 'Transcript'}
      />
      <ol className={styles.stack}>
        {transcript.segments.map((seg) => (
          <li key={seg.id} className={styles.card}>
            <div className={styles.mono} style={{ color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
              {formatDuration(seg.start)} → {formatDuration(seg.end)}
              {seg.speaker ? ` · ${seg.speaker}` : ''}
            </div>
            <p>{seg.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
