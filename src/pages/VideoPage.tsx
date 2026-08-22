import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { GenerateShortsModal } from '../components/video/GenerateShortsModal';
import { ShortCard } from '../components/video/ShortCard';
import { SourceSelector } from '../components/sources/SourceSelector';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
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

  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (sourceIds.length > 0) return;
    const first = videos.find((v) => v.sourceId)?.sourceId;
    if (first) setSourceIds([first]);
  }, [sourceIds.length, videos]);

  const chosen = videos.find((v) => v.sourceId && sourceIds.includes(v.sourceId)) ?? videos[0];

  async function generate(config: {
    presetId: string;
    captionsEnabled: boolean;
    captionStyle: string;
    numberOfClips: number;
  }) {
    if (!id || !chosen) {
      toast.error('Select a video, then generate.');
      return;
    }
    setModalOpen(false);
    setBusy(true);
    try {
      await shortService.create(
        {
          projectId: id,
          videoId: chosen.id,
          sourceIds,
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

  return (
    <div className={styles.page}>
      <PageHeader
        title="Video"
        actions={
          id ? (
            <>
              <Button variant="secondary" onClick={() => setAdd(true, 'video')}>Add source</Button>
              <Button variant="primary" disabled={!chosen || busy} onClick={() => setModalOpen(true)}>
                Generate shorts
              </Button>
            </>
          ) : null
        }
      />

      {id && (
        <div className={styles.stack}>
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
            variant="video"
          />
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
      ) : !busy ? (
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
