import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { AudioPlayer } from '../components/audio/AudioPlayer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Textarea } from '../components/ui/Textarea';
import { audioService } from '../services/audioService';
import { toast } from '../store/toastStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Job } from '../types';
import styles from './page.module.css';

export function AudioDraftPage() {
  const { id, audId } = useParams<{ id: string; audId: string }>();
  const navigate = useNavigate();
  const audio = useWorkspaceStore((s) => s.audio);
  const updateAudio = useWorkspaceStore((s) => s.updateAudio);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const draft = audio.find((item) => item.id === audId);

  const [title, setTitle] = useState(draft?.title ?? '');
  const [script, setScript] = useState(draft?.script ?? '');
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [job, setJob] = useState<Job | null>(null);

  useEffect(() => {
    setTitle(draft?.title ?? '');
    setScript(draft?.script ?? '');
  }, [draft?.id, draft?.title, draft?.script]);

  async function save() {
    if (!audId) return;
    setSaving(true);
    try {
      const next = await audioService.update(audId, { title: title.trim() || undefined, script });
      updateAudio(next);
      toast.success('Draft saved');
    } catch {
      toast.error('Could not save this draft.');
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    const voiceId = 'default';
    if (!id || !audId) return;
    setBusy(true);
    try {
      const saved = await audioService.update(audId, { title: title.trim() || undefined, script });
      updateAudio(saved);
      await audioService.render(audId, voiceId, (next) => {
        setJob(next);
        setActiveJob(next);
      });
      const next = await audioService.get(audId);
      if (next) updateAudio(next);
      setActiveJob(null);
      setJob(null);
      toast.success('Draft updated');
    } catch {
      toast.error('Audio generation couldn\'t be completed.');
    } finally {
      setBusy(false);
    }
  }

  async function handleExport(format: 'wav' | 'mp3') {
    if (!audId) return;
    try {
      const savedPath = await audioService.exportFile(audId, format);
      if (savedPath) toast.success('Exported successfully');
    } catch {
      toast.error('Failed to export.');
    }
  }

  async function separate() {
    if (!audId) return;
    setBusy(true);
    try {
      await audioService.separate(audId, (next) => {
        setJob(next);
        setActiveJob(next);
      });
      toast.success('Audio separated into vocals and background');
    } catch {
      toast.error('Separation failed.');
    } finally {
      setBusy(false);
      setJob(null);
      setActiveJob(null);
    }
  }

  if (!draft) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>We couldn&apos;t find that draft.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={title.trim() || 'Audio draft'}
        actions={
          <>
            <Button variant="ghost" onClick={() => navigate(`/projects/${id}/audio`)}>Back</Button>
            {draft.filePath && (
              <>
                <Button variant="secondary" disabled={busy} onClick={separate}>Separate tracks</Button>
                <Button variant="secondary" onClick={() => handleExport('wav')}>Export .wav</Button>
              </>
            )}
            <Button variant="secondary" loading={saving} onClick={save}>Save</Button>
            <Button variant="primary" disabled={busy || !script.trim()} onClick={generate}>
              Generate
            </Button>
          </>
        }
      />

      {draft.filePath && (
        <AudioPlayer
          filePath={draft.filePath}
          title={title.trim() || 'Synthesized Speech'}
          duration={draft.duration ?? undefined}
        />
      )}

      <div className={styles.stack}>
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea
          label="Script"
          rows={12}
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
      </div>

      {job && busy && (
        <div style={{ marginTop: 24 }}>
          <ProcessingPanel job={job} title="Generating audio" />
        </div>
      )}
    </div>
  );
}
