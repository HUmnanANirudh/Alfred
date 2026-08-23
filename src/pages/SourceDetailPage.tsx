import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { sourceService } from '../services/sourceService';
import { transcriptService } from '../services/transcriptService';
import { modelService } from '../services/modelService';
import { toast } from '../store/toastStore';
import { hydrateWorkspace } from '../store/hydrate';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatDuration, formatWordCount } from '../utils/format';
import { assetUrl } from '../services/ipc';
import styles from './page.module.css';

export function SourceDetailPage() {
  const { id, srcId } = useParams<{ id: string; srcId: string }>();
  const source = useWorkspaceStore((s) => s.sources.find((x) => x.id === srcId));
  const videos = useWorkspaceStore((s) => s.videos);
  const transcripts = useWorkspaceStore((s) => s.transcripts);
  const navigate = useNavigate();
  
  const [videoUrl, setVideoUrl] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [videoError, setVideoError] = useState(false);
  const [engineHealth, setEngineHealth] = useState<{ audio: boolean; ffmpeg: boolean } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const video = videos.find((v) => v.sourceId === source?.id);
  const transcriptMeta = source?.metadata?.type === 'transcript' ? source.metadata : undefined;
  const transcript = transcriptMeta
    ? transcripts.find((t) => t.videoId === transcriptMeta.videoId)
    : transcripts.find((t) => t.videoId === video?.id);
  const isVideoSource = source?.type === 'youtube' || source?.type === 'video';

  const videoToPlay = transcriptMeta
    ? videos.find((v) => v.id === transcriptMeta.videoId)
    : video;

  useEffect(() => {
    setVideoError(false);
    setCurrentTime(0);
    if (videoToPlay?.filePath) {
      assetUrl(videoToPlay.filePath).then((url) => {
        console.log('[Video] Asset URL resolved:', url?.substring(0, 100));
        if (url) {
          setVideoUrl(url);
        } else {
          setVideoError(true);
        }
      }).catch((e) => { console.error('[Video] assetUrl failed:', e); setVideoError(true); });
    } else {
      setVideoUrl('');
    }
  }, [videoToPlay?.filePath]);

  useEffect(() => {
    modelService.engineHealth().then(setEngineHealth).catch(() => {});
  }, []);

  async function handleDelete() {
    if (!srcId) return;
    await sourceService.delete(srcId);
    if (id) await hydrateWorkspace(id);
    toast.info('Source removed');
    navigate(`/projects/${id}/video`);
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={source?.title ?? 'Source Details'}
        actions={
          <>
            {isVideoSource && video && !transcript && video.filePath && (
              <Button variant="primary" disabled={isGenerating} onClick={async () => {
                setIsGenerating(true);
                try {
                  toast.info('Generating transcript...');
                  const job = await transcriptService.generate(video.id);
                  if (job.status === 'error') {
                    throw new Error(job.error || 'Failed to generate transcript');
                  }
                  if (id) await hydrateWorkspace(id);
                  toast.success('Transcript generated');
                } catch (e: any) {
                  toast.error(e.message || 'Failed to generate transcript');
                } finally {
                  setIsGenerating(false);
                }
              }}>
                {isGenerating ? 'Generating...' : 'Generate transcript'}
              </Button>
            )}
            {isVideoSource && video && transcript && (
              <Button variant="primary" onClick={() => navigate(`/projects/${id}/video`)}>
                Generate video
              </Button>
            )}
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/writing/article`)}>Write article</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      />

      {isVideoSource && video && video.filePath && !transcript && engineHealth && !engineHealth.audio && (
        <div style={{
          padding: '12px 16px', marginBottom: 16,
          background: 'var(--color-warning-dim)',
          border: '1px solid var(--color-warning)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--color-warning)',
          fontSize: 'var(--text-sm)',
        }}>
          ⚠️ audio.cpp is not running — transcription unavailable. Start <code>audiocpp_server</code> on port 8766.
        </div>
      )}

      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, position: 'sticky', top: '100px' }}>
          {videoUrl && !videoError ? (
            <video 
              ref={videoRef}
              controls 
              style={{ width: '100%', borderRadius: 'var(--radius-lg)', background: '#000', maxHeight: '500px' }}
              src={videoUrl}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onError={(e) => {
                console.error('[Video] Failed to load:', videoUrl?.substring(0, 100), e);
                setVideoError(true);
              }}
            />
          ) : isVideoSource ? (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#888', gap: 8, padding: 24, textAlign: 'center' }}>
              <span style={{ fontSize: 32 }}>🎬</span>
              {videoError ? (
                <>
                  <span style={{ color: 'var(--color-error)' }}>Could not load video</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                    The file exists but the player couldn't access it. Try restarting the app.
                  </span>
                </>
              ) : video?.filePath ? (
                <span>Loading video...</span>
              ) : (
                <>
                  <span style={{ color: 'var(--color-text-secondary)' }}>No local video file</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                    Video could not be downloaded. You can still generate a transcript if a file is available.
                  </span>
                </>
              )}
            </div>
          ) : (
            <div style={{ width: '100%', aspectRatio: '16/9', background: '#000', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
              No video for this source.
            </div>
          )}
          <p className={styles.muted} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
            <span style={{ padding: '4px 8px', background: 'var(--color-bg-elevated)', borderRadius: 4 }}>{source?.type}</span>
            {source?.wordCount != null && <span>{formatWordCount(source.wordCount)}</span>}
            {source?.createdAt && <span>{formatDate(source.createdAt)}</span>}
          </p>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', paddingRight: '8px' }}>
          {transcript ? (
            transcript.segments.map((seg) => {
              const isActive = currentTime >= seg.start && currentTime <= seg.end;
              const isEditing = editingSegmentId === seg.id;

              return (
                <div 
                  key={seg.id} 
                  className={styles.card}
                  style={{
                    cursor: isEditing ? 'default' : 'pointer',
                    borderColor: isActive ? 'var(--color-accent)' : 'transparent',
                    background: isActive ? 'var(--color-accent-subtle)' : 'var(--color-bg-elevated)',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    if (!isEditing && videoRef.current) {
                      videoRef.current.currentTime = seg.start;
                      videoRef.current.play();
                    }
                  }}
                >
                  <div className={styles.mono} style={{ display: 'flex', justifyContent: 'space-between', color: isActive ? 'var(--color-accent)' : 'var(--color-text-tertiary)', marginBottom: 8 }}>
                    <span>
                      {formatDuration(seg.start)} → {formatDuration(seg.end)}
                      {seg.speaker ? ` · ${seg.speaker}` : ''}
                    </span>
                    <Button variant="secondary" onClick={(e) => {
                      e.stopPropagation();
                      if (isEditing) {
                        setEditingSegmentId(null);
                        transcriptService.updateSegment(transcript.id, { ...seg, text: editingText }).then(() => hydrateWorkspace(id!));
                      } else {
                        setEditingSegmentId(seg.id);
                        setEditingText(seg.text);
                      }
                    }}>
                      {isEditing ? 'Save' : 'Edit'}
                    </Button>
                  </div>
                  {isEditing ? (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Textarea 
                        value={editingText} 
                        onChange={(e) => setEditingText(e.target.value)} 
                        rows={6}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p style={{ margin: 0 }}>{seg.text}</p>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.card}>
              {isVideoSource ? (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                  <p className={styles.muted} style={{ marginBottom: 12 }}>No transcript yet.</p>
                  {!video?.filePath ? (
                    <p className={styles.muted} style={{ fontSize: 'var(--text-sm)' }}>
                      Download the video file first, then generate a transcript.
                    </p>
                  ) : (
                    <p className={styles.muted} style={{ fontSize: 'var(--text-sm)' }}>
                      Click &quot;Generate transcript&quot; above to transcribe this video.
                    </p>
                  )}
                </div>
              ) : (
                <p className={styles.prose}>{source?.content ?? 'No content available for this source.'}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
