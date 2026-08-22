import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PenLine } from 'lucide-react';
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
import type { WritingOutput, WritingTone } from '../types';
import styles from './page.module.css';

function applyEdit(content: string, action: 'rewrite' | 'expand' | 'shorten'): string {
  if (action === 'shorten') {
    const paras = content.split(/\n\n+/);
    return paras.slice(0, Math.max(1, Math.ceil(paras.length * 0.6))).join('\n\n');
  }
  if (action === 'expand') {
    return `${content}\n\nA useful next beat: keep the same sources, and make the claim more specific before you publish.`;
  }
  return content
    .replace(/Alfred is built around that idea/g, 'Alfred is organized around that idea')
    .replace(/This mock article exists so Phase 1 can feel complete/g, 'This draft exists so the writing room can be judged as a workspace');
}

export function WritingArticlePage() {
  const { id } = useParams<{ id: string }>();
  const writing = useWorkspaceStore((s) => s.writing);
  const addWriting = useWorkspaceStore((s) => s.addWriting);
  const updateWriting = useWorkspaceStore((s) => s.updateWriting);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState<WritingTone>('professional');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const current = writing.find((w) => w.type === 'article');

  async function generate() {
    if (!id) return;
    setBusy(true);
    try {
      const output = await writingService.generateArticle({
        projectId: id,
        title: title.trim() || undefined,
        topic: topic.trim() || 'From project sources',
        sourceIds,
        tone,
        length,
      });
      addWriting(output);
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
    if (!current) return;
    const next = { ...current, content: applyEdit(current.content, action) };
    await persist(next);
    toast.info(action === 'rewrite' ? 'Passage rewritten' : action === 'expand' ? 'Draft expanded' : 'Draft shortened');
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Write an Article"
        description="Turn your project knowledge into a long-form draft."
      />
      <div className={styles.stack}>
        <Input label="Title" placeholder="The Future of AI" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input
          label="What should this article be about?"
          placeholder="Local-first creator workflows"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
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
          <div>
            <p className={styles.muted} style={{ marginBottom: 8 }}>Project sources</p>
            <SourceSelector
              projectId={id}
              selected={sourceIds}
              onChange={setSourceIds}
              emptyAction={{ label: 'Add source', onClick: () => setAdd(true) }}
            />
          </div>
        )}
        <Button variant="primary" loading={busy} onClick={generate}>Generate Article</Button>
      </div>

      {!current && !busy && (
        <EmptyState
          icon={<PenLine size={40} strokeWidth={1.25} />}
          title="No drafts yet"
          description="Use your project sources to create something."
        />
      )}

      {current && (
        <div className={styles.stack} style={{ marginTop: 24 }}>
          <div className={styles.row}>
            <Button size="sm" variant="secondary" onClick={generate} loading={busy}>Regenerate</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('rewrite')}>Rewrite</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('expand')}>Expand</Button>
            <Button size="sm" variant="ghost" onClick={() => transform('shorten')}>Shorten</Button>
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
