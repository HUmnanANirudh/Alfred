import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { transcriptService } from '../services/transcriptService';
import { assetUrl } from '../services/ipc';
import { toast } from '../store/toastStore';
import { hydrateWorkspace } from '../store/hydrate';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDuration } from '../utils/format';
import type { Job, TranscriptSegment } from '../types';
import styles from './page.module.css';

export function TranscriptDetailPage() {
  const { trsId, id } = useParams<{ trsId: string; id: string }>();
  const navigate = useNavigate();
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const videos = useWorkspaceStore((s) => s.videos);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const setTranscripts = useWorkspaceStore((s) => s.setTranscripts);

  const transcript = transcripts.find((t) => t.videoId === trsId || t.id === trsId);
  const video = videos.find((v) => v.id === transcript?.videoId);

  const [videoUrl, setVideoUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (video?.filePath) {
      assetUrl(video.filePath).then(setVideoUrl).catch(console.error);
    }
  }, [video?.filePath]);

  async function handleDiarize() {
    if (!transcript?.videoId || !id) return;
    setBusy(true);
    try {
      toast.info('Diarizing speakers...');
      const result = await transcriptService.diarize(transcript.videoId, (next) => {
        setJob(next);
        setActiveJob(next);
      });
      if (result.status === 'error') {
        throw new Error(result.error || 'Diarization failed');
      }
      await hydrateWorkspace(id);
      toast.success('Speakers identified');
    } catch (e: any) {
      toast.error(e.message || 'Diarization failed');
    } finally {
      setBusy(false);
      setJob(null);
      setActiveJob(null);
    }
  }

  function startEdit(seg: TranscriptSegment) {
    setEditingId(seg.id);
    setEditText(seg.text);
  }

  async function saveEdit(seg: TranscriptSegment) {
    if (!transcript || !id) return;
    try {
      const updated = await transcriptService.updateSegment(transcript.id, {
        ...seg,
        text: editText,
      });
      setTranscripts(
        transcripts.map((t) => (t.id === updated.id ? updated : t)),
      );
      setEditingId(null);
      toast.success('Segment updated');
    } catch {
      toast.error('Could not update segment');
    }
  }

  function seekTo(time: number) {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.play();
    }
  }

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
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(`/projects/${id}/video`)}>Back</Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={handleDiarize}
            >
              {busy ? 'Diarizing...' : 'Diarize speakers'}
            </Button>
          </>
        }
      />

      {job && busy && (
        <div style={{ marginBottom: 24 }}>
          <ProcessingPanel job={job} title="Diarizing speakers" />
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, position: 'sticky', top: '100px' }}>
          {videoUrl ? (
            <video
              ref={videoRef}
              controls
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000', maxHeight: '400px' }}
              src={videoUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          ) : (
            <div style={{
              width: '100%', aspectRatio: '16/9', background: '#000',
              borderRadius: 'var(--radius-lg)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', color: '#666'
            }}>
              No video available.
            </div>
          )}
          <p className={styles.muted} style={{ marginTop: 12 }}>
            {transcript.segments.length} segments · {transcript.engine ?? 'asr'}
          </p>
        </div>

        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column', gap: '12px',
          maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '8px'
        }}>
          {transcript.segments.map((seg) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;
            const isEditing = editingId === seg.id;
            return (
              <div
                key={seg.id}
                className={styles.card}
                style={{
                  cursor: 'pointer',
                  borderColor: isActive ? 'var(--color-accent)' : 'transparent',
                  background: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-elevated)',
                  transition: 'all 0.2s',
                }}
                onClick={() => !isEditing && seekTo(seg.start)}
              >
                <div className={styles.mono} style={{
                  color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)',
                  marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <span>{formatDuration(seg.start)} → {formatDuration(seg.end)}</span>
                  {seg.speaker && <span style={{
                    padding: '2px 6px', background: 'var(--color-bg-hover)',
                    borderRadius: 4, fontSize: 'var(--text-xs)',
                  }}>{seg.speaker}</span>}
                  {seg.confidence != null && (
                    <span style={{ fontSize: 'var(--text-xs)', opacity: 0.6 }}>
                      {Math.round(seg.confidence * 100)}%
                    </span>
                  )}
                  <div style={{ flex: 1 }} />
                  {!isEditing && (
                    <button
                      onClick={(e) => { e.stopPropagation(); startEdit(seg); }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--color-text-tertiary)',
                        cursor: 'pointer', fontSize: 'var(--text-xs)', padding: '2px 6px',
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {isEditing ? (
                  <div onClick={(e) => e.stopPropagation()}>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%', background: 'var(--color-bg-base)',
                        border: '1px solid var(--color-border-focus)',
                        borderRadius: 'var(--radius-sm)', color: 'var(--color-text-primary)',
                        padding: 'var(--space-2)', fontSize: 'var(--text-base)',
                        fontFamily: 'inherit', resize: 'vertical',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <Button size="sm" variant="primary" onClick={() => saveEdit(seg)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p style={{ margin: 0 }}>{seg.text}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
