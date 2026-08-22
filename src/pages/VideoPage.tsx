import { useNavigate, useParams } from 'react-router-dom';
import { Video as VideoIcon } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatDuration } from '../utils/format';
import styles from './page.module.css';

export function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const videos = useWorkspaceStore((s) => s.videos);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const navigate = useNavigate();

  function addVideo() {
    setAdd(true, 'video');
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Video"
        description="Add a YouTube URL or a file from this device, then cut shorts from the transcript."
        actions={<Button variant="primary" onClick={addVideo}>Add video</Button>}
      />
      {videos.length === 0 ? (
        <EmptyState
          icon={<VideoIcon size={40} strokeWidth={1.25} />}
          title="No videos yet"
          description="Bring in a YouTube video or choose a local file."
          actionLabel="Add video"
          onAction={addVideo}
        />
      ) : (
        <div className={styles.stack}>
          {videos.map((video) => (
            <article key={video.id} className={styles.card}>
              <h3>{video.title}</h3>
              <p className={styles.muted}>
                {video.duration != null ? formatDuration(video.duration) : 'Duration unknown'} · {formatDate(video.createdAt)}
                {video.hasTranscript ? ' · Transcript ready' : ''}
              </p>
              <div className={styles.row} style={{ marginTop: 12 }}>
                <Button size="sm" onClick={() => navigate(`/projects/${id}/video/shorts?video=${video.id}`)}>Create shorts</Button>
                {video.sourceId && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${id}/sources/${video.sourceId}`)}>
                    Open source / transcript
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
