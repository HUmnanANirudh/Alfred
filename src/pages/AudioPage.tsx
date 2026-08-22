import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { VoiceSelector } from '../components/audio/VoiceSelector';
import { SourceSelector } from '../components/sources/SourceSelector';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { audioService } from '../services/audioService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatDuration } from '../utils/format';
import type { Job } from '../types';
import styles from './page.module.css';

export function AudioPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const audio = useWorkspaceStore((s) => s.audio);
  const sources = useWorkspaceStore((s) => s.sources);
  const setAudio = useWorkspaceStore((s) => s.setAudio);
  const setActiveJob = useWorkspaceStore((s) => s.setActiveJob);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
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
      toast.error('Select a source, then generate.');
      return;
    }
    const script = scriptFromSources();
    if (!script.trim()) {
      toast.error('That source has no text yet.');
      return;
    }
    setVoiceOpen(false);
    setBusy(true);
    try {
      await audioService.generate(
        { projectId: id, voiceId, script, sourceIds },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      const list = await audioService.list(id);
      setAudio(list);
      setActiveJob(null);
      setJob(null);
      toast.success('Draft ready');
      if (list[0]) navigate(`/projects/${id}/audio/${list[0].id}`);
    } catch {
      toast.error('Audio generation couldn\'t be completed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="Audio" />

      <div className={styles.stack}>
        {id && (
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
            variant="audio"
            emptyAction={{ label: 'Add source', onClick: () => setAdd(true, 'text') }}
          />
        )}
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
          title="No drafts yet"
        />
      ) : (
        <table className={styles.table} style={{ marginTop: 32 }}>
          <thead>
            <tr>
              <th>Draft</th>
              <th>Voice</th>
              <th>Length</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {audio.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link to={`/projects/${id}/audio/${item.id}`} className={styles.tableLink}>
                    {item.title || item.script.slice(0, 48)}
                  </Link>
                </td>
                <td>{item.voiceName}</td>
                <td>{item.duration != null ? formatDuration(item.duration) : '—'}</td>
                <td>{formatDate(item.updatedAt ?? item.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <VoiceSelector
        isOpen={voiceOpen}
        onClose={() => setVoiceOpen(false)}
        onConfirm={generate}
      />
    </div>
  );
}
