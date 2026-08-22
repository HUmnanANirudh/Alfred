import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video as VideoIcon } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { videoService } from '../services/videoService';
import { transcriptService } from '../services/transcriptService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatDuration } from '../utils/format';
import styles from './page.module.css';

export function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const videos = useWorkspaceStore((s) => s.videos);
  const setVideos = useWorkspaceStore((s) => s.setVideos);
  const setTranscripts = useWorkspaceStore((s) => s.setTranscripts);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  async function addUrl() {
    if (!id || !url.trim()) return;
    setBusy(true);
    try {
      await videoService.addFromUrl(id, url.trim());
      setVideos(await videoService.list(id));
      setTranscripts(await transcriptService.list(id));
      toast.success('Video added');
      setOpen(false);
      setUrl('');
    } catch {
      toast.error('We couldn\'t add this video.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Video"
        description="Bring in a YouTube video or a local file, then cut shorts from the transcript."
        actions={
          <>
            <Button variant="secondary" onClick={() => setOpen(true)}>Add from URL</Button>
            <Button variant="primary" onClick={() => setAdd(true)}>Add source</Button>
          </>
        }
      />
      {videos.length === 0 ? (
        <EmptyState
          icon={<VideoIcon size={40} strokeWidth={1.25} />}
          title="No videos yet"
          description="Bring in a YouTube video or choose a local file."
          actionLabel="Add source"
          onAction={() => setAdd(true)}
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
                <Button size="sm" onClick={() => navigate(`/projects/${id}/video/shorts`)}>Create short</Button>
                {video.hasTranscript && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/projects/${id}/video/transcripts/${video.id}`)}>
                    Open transcript
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        isOpen={open}
        onClose={() => !busy && setOpen(false)}
        title="Add video from URL"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={addUrl} loading={busy}>Add video</Button>
          </>
        }
      >
        <Input label="Video URL" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} />
      </Modal>
    </div>
  );
}
