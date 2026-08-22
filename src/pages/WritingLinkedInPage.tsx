import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SourceSelector } from '../components/sources/SourceSelector';
import { ArticleEditor } from '../components/writing/ArticleEditor';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { writingService } from '../services/writingService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { WritingTone } from '../types';
import styles from './page.module.css';

export function WritingLinkedInPage() {
  const { id } = useParams<{ id: string }>();
  const writing = useWorkspaceStore((s) => s.writing);
  const addWriting = useWorkspaceStore((s) => s.addWriting);
  const updateWriting = useWorkspaceStore((s) => s.updateWriting);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<WritingTone>('professional');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const current = writing.find((w) => w.type === 'linkedin');

  async function generate() {
    if (!id) return;
    setBusy(true);
    try {
      const output = await writingService.generateLinkedIn({
        projectId: id,
        topic: topic.trim() || undefined,
        sourceIds,
        tone,
      });
      addWriting(output);
      toast.success('Draft generated');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="LinkedIn" description="A polished post from the same project sources." />
      <div className={styles.stack}>
        <Input
          label="Topic"
          placeholder="Why research should stay on the desk"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value as WritingTone)}>
          <option value="professional">Professional</option>
          <option value="educational">Educational</option>
          <option value="conversational">Conversational</option>
        </Select>
        {id && (
          <div>
            <p className={styles.muted} style={{ marginBottom: 8 }}>Sources — article URL or pasted text</p>
            <SourceSelector
              projectId={id}
              selected={sourceIds}
              onChange={setSourceIds}
              filterTypes={['article', 'text']}
              emptyAction={{ label: 'Add URL or paste', onClick: () => setAdd(true, 'writing') }}
            />
          </div>
        )}
        <Button variant="primary" loading={busy} onClick={generate}>Generate post</Button>
      </div>
      {!current && !busy && (
        <EmptyState
          icon={<Briefcase size={40} strokeWidth={1.25} />}
          title="No drafts yet"
          description="Use your project sources to create something."
        />
      )}
      {current && (
        <div className={styles.stack} style={{ marginTop: 24 }}>
          <Button size="sm" variant="secondary" onClick={generate} loading={busy}>Regenerate</Button>
          <ArticleEditor
            content={current.content}
            onChange={(value) => {
              updateWriting({ ...current, content: value });
              void writingService.update(current.id, value).then(updateWriting);
            }}
          />
        </div>
      )}
    </div>
  );
}
