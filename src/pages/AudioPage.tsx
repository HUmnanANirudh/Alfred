import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { AudioCard } from '../components/audio/AudioCard';
import { VoiceSelector } from '../components/audio/VoiceSelector';
import { SourceSelector } from '../components/sources/SourceSelector';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Textarea } from '../components/ui/Textarea';
import { audioService } from '../services/audioService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Job } from '../types';
import styles from './page.module.css';

export function AudioPage() {
  const { id } = useParams<{ id: string }>();
  const audio = useWorkspaceStore((s) => s.audio);
  const sources = useWorkspaceStore((s) => s.sources);
  const setAudio = useWorkspaceStore((s) => s.setAudio);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [script, setScript] = useState('');
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  function scriptFromSources() {
    return sources
      .filter((s) => sourceIds.includes(s.id))
      .map((s) => s.content || s.excerpt || s.title)
      .join('\n\n');
  }

  async function generate(voiceId: string) {
    if (!id) return;
    if (sourceIds.length === 0) {
      toast.error('Add a source, then generate.');
      return;
    }
    const finalScript = script.trim() || scriptFromSources();
    setVoiceOpen(false);
    setBusy(true);
    try {
      await audioService.generate(
        { projectId: id, voiceId, script: finalScript, sourceIds },
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
        actions={<Button variant="primary" onClick={() => setAdd(true)}>Add source</Button>}
      />

      <div className={styles.stack}>
        {id && (
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
            emptyAction={{ label: 'Add source', onClick: () => setAdd(true) }}
          />
        )}
        <Textarea
          label="Direction (optional)"
          rows={6}
          placeholder="Leave blank to speak from the selected sources…"
          value={script}
          onChange={(e) => setScript(e.target.value)}
        />
        <Button
          variant="primary"
          disabled={sourceIds.length === 0 || busy}
          onClick={() => setVoiceOpen(true)}
        >
          Generate audio
        </Button>
      </div>

      {job && busy && (
        <div style={{ marginTop: 24 }}>
          <ProcessingPanel job={job} title="Generating audio" />
        </div>
      )}

      {audio.length === 0 && !busy ? (
        <EmptyState
          icon={<Mic size={40} strokeWidth={1.25} />}
          title="Nothing generated yet"
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
