import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clapperboard, Sparkles } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { GenerateShortsModal } from '../components/video/GenerateShortsModal';
import { ShortCard } from '../components/video/ShortCard';
import { ClipCandidateCard } from '../components/video/ClipCandidateCard';
import { SourceSelector } from '../components/sources/SourceSelector';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { shortService } from '../services/shortService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { hydrateWorkspace } from '../store/hydrate';
import type { ClipCandidate, Job } from '../types';
import styles from './page.module.css';

export function VideoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const videos = useWorkspaceStore((s) => s.videos);
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const shorts = useWorkspaceStore((s) => s.shorts);
  const setShorts = useWorkspaceStore((s) => s.setShorts);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);

  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  // 2-step studio state
  const [analyzing, setAnalyzing] = useState(false);
  const [candidates, setCandidates] = useState<ClipCandidate[] | null>(null);
  const [renderingIds, setRenderingIds] = useState<Set<string>>(new Set());
  const [renderedIds, setRenderedIds] = useState<Set<string>>(new Set());

  const chosen = videos.find((v) => v.sourceId && sourceIds.includes(v.sourceId)) ?? videos[0];

  // Step 1: Ask LLM to analyze and propose timestamps
  async function analyzeClips() {
    if (!chosen) { toast.error('Select a video source first.'); return; }
    setAnalyzing(true);
    setCandidates(null);
    try {
      const clips = await shortService.analyzeClips(chosen.id);
      setCandidates(clips);
      if (clips.length === 0) {
        toast.error('No strong clip moments found. Make sure a transcript exists.');
      } else {
        toast.success(`Found ${clips.length} potential clips — pick which to render!`);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setAnalyzing(false);
    }
  }

  // Step 2: Render a specific selected clip
  async function renderClip(clip: ClipCandidate) {
    if (!id || !chosen) return;
    setRenderingIds((prev) => new Set(prev).add(clip.id));
    try {
      await shortService.renderClip(
        {
          projectId: id,
          videoId: chosen.id,
          start: clip.start,
          end: clip.end,
          hook: clip.hook,
          hookScore: clip.hookScore,
          captionsEnabled: false,
          captionStyle: 'clean',
        },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      setRenderedIds((prev) => new Set(prev).add(clip.id));
      setShorts(await shortService.list(id));
      toast.success('Clip rendered!');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    } finally {
      setRenderingIds((prev) => {
        const next = new Set(prev);
        next.delete(clip.id);
        return next;
      });
      setActiveJob(null);
      setJob(null);
    }
  }

  // Legacy bulk generate (kept for modal compatibility)
  async function generate(config: {
    presetId: string;
    captionsEnabled: boolean;
    captionStyle: string;
    numberOfClips: number;
  }) {
    if (!id || !chosen) { toast.error('Select a video, then generate.'); return; }
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
        (next) => { setJob(next); setActiveJob(next); },
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

  const isAnyRendering = renderingIds.size > 0 || busy;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Clips Studio"
        actions={
          id ? (
            <>
              <Button variant="secondary" onClick={() => setAdd(true, 'video')}>Add source</Button>
              {transcripts.length > 0 && (
                <Button variant="secondary" onClick={() => navigate(`/projects/${id}/video/transcripts`)}>
                  Transcripts
                </Button>
              )}
              <Button
                variant="primary"
                disabled={!chosen || analyzing || isAnyRendering}
                loading={analyzing}
                onClick={analyzeClips}
              >
                <Sparkles size={16} />
                {analyzing ? 'Analyzing…' : 'Analyze Clips'}
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

      {/* Step 1: Analysis in progress */}
      {analyzing && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 48, color: 'var(--color-text-secondary)' }}>
          <Spinner size={28} />
          <p style={{ margin: 0 }}>Reading transcript and finding the best moments…</p>
        </div>
      )}

      {/* Step 2: Show clip candidates */}
      {candidates && candidates.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <p style={{ margin: '0 0 16px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
            Found <strong style={{ color: 'var(--color-text-primary)' }}>{candidates.length} clip candidates</strong> — edit the timestamps if needed, then render the ones you want.
          </p>
          <div className={styles.stack}>
            {candidates.map((clip) => (
              <ClipCandidateCard
                key={clip.id}
                clip={clip}
                onRender={renderClip}
                rendering={renderingIds.has(clip.id)}
                rendered={renderedIds.has(clip.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Render job progress */}
      {job && isAnyRendering && (
        <div style={{ marginTop: 24 }}>
          <ProcessingPanel job={job} title="Rendering clip" />
        </div>
      )}

      {/* Rendered shorts */}
      {shorts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          {candidates && <h3 style={{ margin: '0 0 12px', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontWeight: 500 }}>Rendered Shorts</h3>}
          <div className={styles.stack}>
            {shorts.map((short) => (
              <ShortCard key={short.id} short={short} onDelete={() => hydrateWorkspace(id!)} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state when nothing is happening */}
      {!analyzing && !candidates && shorts.length === 0 && !busy && (
        <EmptyState
          icon={<Clapperboard size={40} strokeWidth={1.25} />}
          title="Clips Studio"
          description="Click 'Analyze Clips' to let the AI read your transcript and propose the best moments to cut."
        />
      )}

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
