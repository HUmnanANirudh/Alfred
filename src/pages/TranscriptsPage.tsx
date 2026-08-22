import { useParams, useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate } from '../utils/format';
import styles from './page.module.css';

export function TranscriptsPage() {
  const { id } = useParams<{ id: string }>();
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const videos = useWorkspaceStore((s) => s.videos);
  const navigate = useNavigate();

  return (
    <div className={styles.page}>
      <PageHeader title="Transcripts" description="Timestamped speech from project videos." />
      {transcripts.length === 0 ? (
        <EmptyState
          icon={<FileText size={40} strokeWidth={1.25} />}
          title="No transcripts yet"
          description="Add a YouTube or local video source to generate a transcript."
        />
      ) : (
        <div className={styles.stack}>
          {transcripts.map((trs) => {
            const video = videos.find((v) => v.id === trs.videoId);
            return (
              <article key={trs.id} className={styles.card}>
                <h3>{video?.title ?? 'Transcript'}</h3>
                <p className={styles.muted}>
                  {trs.segments.length} segments · {trs.engine ?? 'asr'} · {formatDate(trs.createdAt)}
                </p>
                <Button size="sm" style={{ marginTop: 12 }} onClick={() => navigate(`/projects/${id}/video/transcripts/${trs.videoId}`)}>
                  Open transcript
                </Button>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
