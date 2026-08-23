import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PenLine } from 'lucide-react';
import { SourceSelector } from '../components/sources/SourceSelector';
import { ArticleEditor } from '../components/writing/ArticleEditor';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { writingService } from '../services/writingService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { WritingOutput, WritingTone } from '../types';
import styles from './page.module.css';



export function WritingArticlePage() {
  const { id } = useParams<{ id: string }>();
  const writing = useWorkspaceStore((s) => s.writing);
  const addWriting = useWorkspaceStore((s) => s.addWriting);
  const updateWriting = useWorkspaceStore((s) => s.updateWriting);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [tone, setTone] = useState<WritingTone>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [stream, setStream] = useState('');
  const current = writing.find((w) => w.type === 'article');

  async function generate() {
    if (!id) return;
    if (sourceIds.length === 0) {
      toast.error('Add a source, then generate.');
      return;
    }
    setBusy(true);
    setStream('');
    try {
      const output = await writingService.generateArticle({
        projectId: id,
        sourceIds,
        tone,
        length,
      }, {
        onStart: () => setStream(''),
        onToken: (token) => setStream((prev) => prev + token),
      });
      addWriting(output);
      setStream('');
      toast.success('Draft generated');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function persist(next: WritingOutput) {
    updateWriting(next);
    const saved = await writingService.update(next.id, next.content);
    updateWriting(saved);
  }

  async function transform(action: 'rewrite' | 'expand' | 'shorten') {
    if (!current || !id) return;
    setBusy(true);
    setStream('');
    try {
      const output = await writingService.rewrite(current.id, action, undefined, tone, {
        onStart: () => setStream(''),
        onToken: (token) => setStream((prev) => prev + token),
      });
      updateWriting(output);
      toast.info(action === 'rewrite' ? 'Passage rewritten' : action === 'expand' ? 'Draft expanded' : 'Draft shortened');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
      setStream('');
    }
  }

  async function handleExport(format: 'md' | 'txt') {
    if (!current) return;
    try {
      const savedPath = await writingService.exportFile(current.id, format);
      if (savedPath) toast.success('Exported successfully');
    } catch {
      toast.error('Failed to export.');
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.stack}>
        <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value as WritingTone)}>
          <option value="professional">Professional</option>
          <option value="casual">Casual</option>
          <option value="educational">Educational</option>
          <option value="sharp">Sharp</option>
          <option value="conversational">Conversational</option>
        </Select>
        <Select label="Length" value={length} onChange={(e) => setLength(e.target.value as 'short' | 'medium' | 'long')}>
          <option value="short">Short</option>
          <option value="medium">Medium</option>
          <option value="long">Long</option>
        </Select>
        {id && (
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
          />
        )}
        <div className={styles.actions}>
          <Button variant="secondary" onClick={() => setAdd(true)}>Add source</Button>
          <Button variant="primary" loading={busy} disabled={sourceIds.length === 0} onClick={generate}>Generate Article</Button>
        </div>
      </div>

      {busy && stream && <pre className={styles.streamDraft}>{stream}</pre>}

      {!current && !busy && (
        <EmptyState
          icon={<PenLine size={40} strokeWidth={1.25} />}
          title="No drafts yet"
        />
      )}

      {current && !busy && (
        <div className={`${styles.stack} ${styles.draft}`}>
          <div className={styles.row}>
            <Button size="sm" variant="secondary" onClick={generate} loading={busy}>Regenerate</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('rewrite')}>Rewrite</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('expand')}>Expand</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('shorten')}>Shorten</Button>
            <div style={{ flex: 1 }} />
            <Button size="sm" variant="secondary" onClick={() => handleExport('md')}>Export .md</Button>
            <Button size="sm" variant="secondary" onClick={() => handleExport('txt')}>Export .txt</Button>
          </div>
          <ArticleEditor
            title={current.title}
            content={current.content}
            onTitleChange={(value) => updateWriting({ ...current, title: value })}
            onChange={(value) => {
              void persist({ ...current, content: value });
            }}
          />
        </div>
      )}
    </div>
  );
}
