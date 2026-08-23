import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Mic } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SourceSelector } from '../components/sources/SourceSelector';
import { ProcessingPanel } from '../components/video/ProcessingPanel';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Textarea } from '../components/ui/Textarea';
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
  const [manualScript, setManualScript] = useState('');
  const [job, setJob] = useState<Job | null>(null);
  const [busy, setBusy] = useState(false);

  function scriptFromSources() {
    return sources
      .filter((s) => sourceIds.includes(s.id))
      .map((s) => s.content || s.excerpt || s.title)
      .join('\n\n');
  }

  async function generate() {
    const voiceId = 'default';
    if (!id) return;
    const isManual = manualScript.trim().length > 0;
    
    if (sourceIds.length === 0 && !isManual) {
      toast.error('Select a source or paste text to generate.');
      return;
    }
    const script = isManual ? manualScript : scriptFromSources();
    if (!script.trim()) {
      toast.error('There is no text to generate from.');
      return;
    }
    setBusy(true);
    try {
      const job = await audioService.generate(
        { projectId: id, voiceId, script, sourceIds },
        (next) => {
          setJob(next);
          setActiveJob(next);
        },
      );
      if (job && job.status === 'error') {
        throw new Error(job.error || 'TTS generation failed');
      }
      
      const list = await audioService.list(id);
      setAudio(list);
      setActiveJob(null);
      setJob(null);
      setBusy(false);
      toast.success('Draft ready');
      if (list[0]) navigate(`/projects/${id}/audio/${list[0].id}`);
    } catch (e: any) {
      toast.error(e?.message || e?.toString() || "Audio generation couldn't be completed.");
      setJob(null);
      setActiveJob(null);
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Audio"
        actions={
          id ? (
            <>
              <Button variant="secondary" onClick={() => setAdd(true, 'text')}>Add source</Button>
              <Button
                variant="primary"
                disabled={(sourceIds.length === 0 && manualScript.trim().length === 0) || busy}
                onClick={generate}
              >
                Generate audio
              </Button>
            </>
          ) : null
        }
      />

      <div className={styles.stack}>
        {id && (
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
            variant="audio"
          />
        )}
        
        <Textarea
          label="Or paste script directly here..."
          rows={4}
          value={manualScript}
          onChange={(e) => setManualScript(e.target.value)}
        />
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
    </div>
  );
}
