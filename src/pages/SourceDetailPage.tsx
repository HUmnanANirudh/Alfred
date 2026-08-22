import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { sourceService } from '../services/sourceService';
import { toast } from '../store/toastStore';
import { hydrateWorkspace } from '../store/hydrate';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatDuration, formatWordCount } from '../utils/format';
import styles from './page.module.css';

export function SourceDetailPage() {
  const { id, srcId } = useParams<{ id: string; srcId: string }>();
  const source = useWorkspaceStore((s) => s.sources.find((x) => x.id === srcId));
  const videos = useWorkspaceStore((s) => s.videos);
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const navigate = useNavigate();

  const video = videos.find((v) => v.sourceId === source?.id);
  const transcriptMeta = source?.metadata?.type === 'transcript' ? source.metadata : undefined;
  const transcript = transcriptMeta
    ? transcripts.find((t) => t.videoId === transcriptMeta.videoId)
    : transcripts.find((t) => t.videoId === video?.id);
  const isVideoSource = source?.type === 'youtube' || source?.type === 'video';

  async function handleDelete() {
    if (!srcId) return;
    await sourceService.delete(srcId);
    if (id) await hydrateWorkspace(id);
    toast.info('Source removed');
    navigate(`/projects/${id}/video`);
  }

  if (!source) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>We couldn&apos;t find that source.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={source.title}
        actions={
          <>
            {isVideoSource && video && (
              <Button variant="primary" onClick={() => navigate(`/projects/${id}/video`)}>
                Generate video
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/writing/article`)}>Write article</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      />
      <p className={styles.muted} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <div className={styles.typeBadge}>
          <span>{source.type}</span>
        </div>
        {source.wordCount != null && <span>{formatWordCount(source.wordCount)}</span>}
        <span>{formatDate(source.createdAt)}</span>
      </p>

      {transcript && (
        <div className={styles.stack} style={{ marginBottom: 24 }}>
          {transcript.segments.map((seg) => (
            <article key={seg.id} className={styles.card}>
              <div className={styles.mono} style={{ color: 'var(--color-text-tertiary)', marginBottom: 8 }}>
                {formatDuration(seg.start)} → {formatDuration(seg.end)}
                {seg.speaker ? ` · ${seg.speaker}` : ''}
              </div>
              <p>{seg.text}</p>
            </article>
          ))}
        </div>
      )}

      {!transcript && (
        <div className={styles.card}>
          <p className={styles.prose}>{source.content ?? 'No extracted text for this source.'}</p>
        </div>
      )}
    </div>
  );
}
