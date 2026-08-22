import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { GenerateShortsModal } from '../components/video/GenerateShortsModal';
import { ShortCard } from '../components/video/ShortCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { shortService } from '../services/shortService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Job } from '../types';
import styles from './page.module.css';

export function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const videos = useWorkspaceStore((s) => s.videos);
  const shorts = useWorkspaceStore((s) => s.shorts);
  const setShorts = useWorkspaceStore((s) => s.setShorts);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);

  const [videoId, setVideoId] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!videos.length) {
      setVideoId('');
      return;
    }
    if (!videos.some((v) => v.id === videoId)) {
      setVideoId(videos[0].id);
    }
  }, [videos, videoId]);

  const chosen = videos.find((v) => v.id === videoId);

  async function generate(config: {
    presetId: string;
    captionsEnabled: boolean;
    captionStyle: string;
    numberOfClips: number;
  }) {
    if (!id || !videoId) {
      toast.error('Add a video source, then generate.');
      return;
    }
    setModalOpen(false);
    setBusy(true);
    try {
      await shortService.create(
        {
          projectId: id,
          videoId,
          sourceIds: chosen?.sourceId ? [chosen.sourceId] : undefined,
          presetId: config.presetId,
          captionsEnabled: config.captionsEnabled,
          captionStyle: config.captionStyle,
          findClipsAuto: true,
          numberOfClips: config.numberOfClips,
        },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      setShorts(await shortService.list(id));
      setActiveJob(null);
      setJob(null);
      toast.success('Shorts ready');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  function addVideoSource() {
    setAdd(true, 'video');
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Video"
        actions={<Button variant="primary" onClick={addVideoSource}>Add source</Button>}
      />

      {videos.length === 0 ? (
        <EmptyState
          icon={<Clapperboard size={40} strokeWidth={1.25} />}
          title="No video sources yet"
          actionLabel="Add source"
          onAction={addVideoSource}
        />
      ) : (
        <div className={styles.stack}>
          <Select
            label="Video"
            value={videoId}
            onChange={(e) => setVideoId(e.target.value)}
          >
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.title}{video.hasTranscript ? ' · transcript' : ''}
              </option>
            ))}
          </Select>
          <Button variant="primary" disabled={!videoId} onClick={() => setModalOpen(true)}>
            Generate shorts
          </Button>
        </div>
      )}

      {job && busy && (
        <div style={{ marginTop: 24 }}>
          <ProcessingPanel job={job} title="Creating shorts" />
        </div>
      )}

      {shorts.length > 0 ? (
        <div className={styles.stack} style={{ marginTop: 32 }}>
          {shorts.map((short) => <ShortCard key={short.id} short={short} />)}
        </div>
      ) : videos.length > 0 && !busy ? (
        <EmptyState
          icon={<Clapperboard size={40} strokeWidth={1.25} />}
          title="Nothing generated yet"
        />
      ) : null}

      <GenerateShortsModal
        isOpen={modalOpen}
        onClose={() => { if (!busy) setModalOpen(false); }}
        video={chosen}
        busy={busy}
        onGenerate={generate}
      />
    </div>
  );
}
