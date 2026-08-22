import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { AudioCard } from '../components/audio/AudioCard';
import { VoiceSelector } from '../components/audio/VoiceSelector';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Textarea } from '../components/ui/Textarea';
import { audioService } from '../services/audioService';
import { toast } from '../store/toastStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Job } from '../types';
import styles from './page.module.css';

export function AudioPage() {
  const { id } = useParams<{ id: string }>();
  const audio = useWorkspaceStore((s) => s.audio);
  const setAudio = useWorkspaceStore((s) => s.setAudio);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const [script, setScript] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate(voiceId: string) {
    if (!id) return;
    setVoiceOpen(false);
    setBusy(true);
    try {
      await audioService.generate(
        { projectId: id, voiceId, script },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      setAudio(await audioService.list(id));
      setActiveJob(null);
      toast.success('Audio ready');
      setJob(null);
    } catch {
      toast.error('Audio generation couldn\'t be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Audio"
        description="Write a script, then choose a voice. Speech stays on this device."
      />

      <div className={styles.stack}>
        <Textarea
          label="What should Alfred say?"
          rows={8}
          placeholder="Paste or write your script…"
          value={script}
          onChange={(e) => setScript(e.target.value)}
          hint={`${script.length.toLocaleString('en-US')} characters`}
        />
        <Button variant="primary" disabled={!script.trim() || busy} onClick={() => setVoiceOpen(true)}>
          Generate Audio
        </Button>
      </div>

      {job && busy && (
        <div style={{ marginTop: 24 }}>
          <ProcessingPanel job={job} title="Generating audio" />
        </div>
      )}

      <h2 style={{ marginTop: 32, marginBottom: 12, fontSize: 17, fontWeight: 500 }}>Generated</h2>
      {audio.length === 0 && !busy ? (
        <EmptyState
          icon={<Mic size={40} strokeWidth={1.25} />}
          title="Nothing generated yet"
          description="Write a script and choose a voice."
        />
      ) : (
        <div className={styles.stack}>
          {audio.map((item) => <AudioCard key={item.id} item={item} />)}
        </div>
      )}

      <VoiceSelector
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={generate}
      />
    </div>
  );
}
