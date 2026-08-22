import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Clapperboard } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { PresetSelector } from '../components/video/PresetSelector';
import { ShortCard } from '../components/video/ShortCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { shortService } from '../services/shortService';
import { toast } from '../store/toastStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Job, VideoPreset } from '../types';
import styles from './page.module.css';

type Step = 'source' | 'preset' | 'config' | 'processing' | 'done';

export function ShortsPage() {
  const { id } = useParams<{ id: string }>();
  const videos = useWorkspaceStore((s) => s.videos);
  const shorts = useWorkspaceStore((s) => s.shorts);
  const setShorts = useWorkspaceStore((s) => s.setShorts);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);

  const [step, setStep] = useState<Step>(shorts.length ? 'done' : 'source');
  const [videoId, setVideoId] = useState(videos[0]?.id ?? '');
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [presetId, setPresetId] = useState('');
  const [captions, setCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('clean');
  const [count, setCount] = useState(3);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    shortService.getPresets().then((list) => {
      setPresets(list);
      setPresetId((current) => current || list[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!videoId && videos[0]) setVideoId(videos[0].id);
  }, [videoId, videos]);

  async function create() {
    if (!id || !videoId || !presetId) return;
    setStep('processing');
    try {
      await shortService.create(
        {
          projectId: id,
          videoId,
          presetId,
          captionsEnabled: captions,
          captionStyle,
          findClipsAuto: true,
          numberOfClips: count,
        },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      const list = await shortService.list(id);
      setShorts(list);
      setActiveJob(null);
      toast.success('Short generation complete');
      setStep('done');
    } catch {
      toast.error('Something went wrong. Try again.');
      setStep('config');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Shorts"
        description="Pick a video, a layout, then let Alfred find the moments."
        actions={step === 'done' ? <Button variant="primary" onClick={() => setStep('source')}>Create shorts</Button> : undefined}
      />

      {step === 'source' && (
        <>
          {videos.length === 0 ? (
            <EmptyState
              icon={<Clapperboard size={40} strokeWidth={1.25} />}
              title="No shorts generated yet"
              description="Add a video source first, then create your first short."
            />
          ) : (
            <div className={styles.stack}>
              <Select label="Video source" value={videoId} onChange={(e) => setVideoId(e.target.value)}>
                {videos.map((v) => <option key={v.id} value={v.id}>{v.title}</option>)}
              </Select>
              <Button variant="primary" onClick={() => setStep('preset')} disabled={!videoId}>Continue</Button>
            </div>
          )}
        </>
      )}

      {step === 'preset' && (
        <div className={styles.stack}>
          <PresetSelector presets={presets} value={presetId} onChange={setPresetId} />
          <div className={styles.row}>
            <Button variant="ghost" onClick={() => setStep('source')}>Back</Button>
            <Button variant="primary" onClick={() => setStep('config')}>Continue</Button>
          </div>
        </div>
      )}

      {step === 'config' && (
        <div className={styles.stack}>
          <Select label="Captions" value={captions ? 'on' : 'off'} onChange={(e) => setCaptions(e.target.value === 'on')}>
            <option value="on">On</option>
            <option value="off">Off</option>
          </Select>
          <Select label="Caption style" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
            <option value="clean">Clean</option>
            <option value="bold">Bold</option>
            <option value="karaoke">Karaoke</option>
          </Select>
          <Select label="Number of clips" value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="5">5</option>
          </Select>
          <div className={styles.row}>
            <Button variant="ghost" onClick={() => setStep('preset')}>Back</Button>
            <Button variant="primary" onClick={create}>Create Shorts</Button>
          </div>
        </div>
      )}

      {step === 'processing' && job && (
        <ProcessingPanel job={job} title="Creating your shorts" />
      )}

      {step === 'done' && (
        shorts.length === 0 ? (
          <EmptyState
            icon={<Clapperboard size={40} strokeWidth={1.25} />}
            title="No shorts generated yet"
            description="Create your first short."
            actionLabel="Create shorts"
            onAction={() => setStep('source')}
          />
        ) : (
          <div className={styles.stack}>
            {shorts.map((short) => <ShortCard key={short.id} short={short} />)}
          </div>
        )
      )}
    </div>
  );
}
