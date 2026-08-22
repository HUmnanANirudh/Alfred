import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Hash } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SourceSelector } from '../components/sources/SourceSelector';
import { SocialPostCard } from '../components/writing/SocialPostCard';
import { ThreadEditor } from '../components/writing/ThreadEditor';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Select } from '../components/ui/Select';
import { Tabs } from '../components/ui/Tabs';
import { writingService } from '../services/writingService';
import { toast } from '../store/toastStore';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { SocialPost, WritingTone } from '../types';
import styles from './page.module.css';

export function WritingXPage() {
  const { id } = useParams<{ id: string }>();
  const writing = useWorkspaceStore((s) => s.writing);
  const posts = useWorkspaceStore((s) => s.posts);
  const setPosts = useWorkspaceStore((s) => s.setPosts);
  const addWriting = useWorkspaceStore((s) => s.addWriting);
  const updatePost = useWorkspaceStore((s) => s.updatePost);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [tab, setTab] = useState<'post' | 'thread'>('post');
  const [tone, setTone] = useState<WritingTone>('sharp');
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const latestPost = writing.find((w) => w.type === 'x_post');
  const latestThread = writing.find((w) => w.type === 'thread');
  const activeId = tab === 'post' ? latestPost?.id : latestThread?.id;
  const visiblePosts = posts.filter((p) => p.outputId === activeId).sort((a, b) => a.index - b.index);

  async function generate() {
    if (!id) return;
    if (sourceIds.length === 0) {
      toast.error('Add a source, then generate.');
      return;
    }
    setBusy(true);
    try {
      const output = tab === 'post'
        ? await writingService.generateXPost({ projectId: id, sourceIds, tone })
        : await writingService.generateThread({ projectId: id, sourceIds, tone, postCount: 7, style: 'educational' });
      addWriting(output);
      const list = await writingService.listPosts(output.id);
      setPosts([...list, ...posts.filter((p) => p.outputId !== output.id)]);
      toast.success('Draft generated');
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function savePost(post: SocialPost) {
    const updated = await writingService.updatePost(post.id, post.content);
    updatePost(updated);
  }

  async function copyAll() {
    const text = visiblePosts.map((p) => p.content).join('\n\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Copied');
    } catch {
      toast.error('Could not copy.');
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader title="X" />
      <Tabs
        tabs={[{ id: 'post', label: 'Short post' }, { id: 'thread', label: 'Thread' }]}
        value={tab}
        onChange={(next) => setTab(next as 'post' | 'thread')}
      />
      <div className={styles.stack} style={{ marginTop: 16 }}>
        <Select label="Tone" value={tone} onChange={(e) => setTone(e.target.value as WritingTone)}>
          <option value="sharp">Sharp</option>
          <option value="casual">Casual</option>
          <option value="professional">Professional</option>
          <option value="educational">Educational</option>
          <option value="conversational">Conversational</option>
        </Select>
        {id && (
          <SourceSelector
            projectId={id}
            selected={sourceIds}
            onChange={setSourceIds}
            emptyAction={{ label: 'Add source', onClick: () => setAdd(true) }}
          />
        )}
        <Button variant="primary" loading={busy} disabled={sourceIds.length === 0} onClick={generate}>
          {tab === 'post' ? 'Write a short X post' : 'Create a thread'}
        </Button>
      </div>

      {visiblePosts.length === 0 && !busy && (
        <EmptyState
          icon={<Hash size={40} strokeWidth={1.25} />}
          title="No drafts yet"
        />
      )}

      {visiblePosts.length > 0 && (
        <div className={styles.stack} style={{ marginTop: 24 }}>
          <div className={styles.row}>
            <Button size="sm" variant="secondary" onClick={generate} loading={busy}>Regenerate</Button>
            <Button size="sm" variant="ghost" onClick={copyAll}>Copy</Button>
          </div>
          {tab === 'post' && visiblePosts[0] && (
            <SocialPostCard
              post={visiblePosts[0]}
              onChange={(content) => {
                const first = visiblePosts[0];
                if (first) void savePost({ ...first, content });
              }}
            />
          )}
          {tab === 'thread' && <ThreadEditor posts={visiblePosts} onChange={(post) => void savePost(post)} />}
        </div>
      )}
    </div>
  );
}
