import { useState } from 'react';
import type { SourceType } from '../../types';
import { sourceService } from '../../services/sourceService';
import { videoService } from '../../services/videoService';
import { transcriptService } from '../../services/transcriptService';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { toast } from '../../store/toastStore';
import { useUiStore } from '../../store/uiStore';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { Tabs } from '../ui/Tabs';
import { Textarea } from '../ui/Textarea';
import styles from './AddSourceModal.module.css';

const TABS = [
  { id: 'article', label: 'Article' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'video', label: 'Local video' },
  { id: 'text', label: 'Paste' },
];

async function refreshMedia(projectId: string) {
  const [videos, transcripts] = await Promise.all([
    videoService.list(projectId),
    transcriptService.list(projectId),
  ]);
  useWorkspaceStore.getState().setVideos(videos);
  useWorkspaceStore.getState().setTranscripts(transcripts);
}

export function AddSourceModal({ projectId }: { projectId: string }) {
  const open = useUiStore((s) => s.addSourceOpen);
  const setOpen = useUiStore((s) => s.setAddSourceOpen);
  const addSource = useWorkspaceStore((s) => s.addSource);

  const [tab, setTab] = useState<SourceType>('article');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [filePath, setFilePath] = useState('');
  const [busy, setBusy] = useState(false);
  const [failReason, setFailReason] = useState('');

  function reset() {
    setUrl('');
    setTitle('');
    setContent('');
    setFilePath('');
    setFailReason('');
    setBusy(false);
  }

  function close() {
    if (busy) return;
    setOpen(false);
    reset();
    setTab('article');
  }

  async function handleArticle() {
    setBusy(true);
    setFailReason('');
    try {
      const result = await sourceService.fetchArticle(url.trim());
      if (!result.success) {
        setFailReason(
          result.reason === 'paywall'
            ? 'This article looks gated. Paste the content manually instead.'
            : 'We couldn\'t read this article. You can paste it manually instead.',
        );
        toast.error('We couldn\'t add this source. Try pasting the content manually.');
        return;
      }
      const source = await sourceService.add({
        projectId,
        type: 'article',
        title: result.data.title ?? 'Untitled article',
        content: result.data.content,
        url: result.data.url ?? url.trim(),
        wordCount: result.data.wordCount,
        excerpt: result.data.excerpt,
        metadata: result.data.metadata,
      });
      addSource(source);
      toast.success('Source added');
      setOpen(false);
      reset();
    } catch {
      setFailReason('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleYoutube() {
    setBusy(true);
    setFailReason('');
    try {
      const result = await sourceService.addYouTube(projectId, url.trim());
      if (!result.success) {
        setFailReason(
          result.reason === 'invalid_url'
            ? 'That doesn\'t look like a YouTube URL.'
            : 'We couldn\'t read this video. Check the URL and try again.',
        );
        toast.error('We couldn\'t add this source.');
        return;
      }
      addSource(result.source);
      await refreshMedia(projectId);
      toast.success('Source added');
      setOpen(false);
      reset();
    } catch {
      setFailReason('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handlePaste() {
    if (!title.trim() || !content.trim()) {
      setFailReason('Add a title and some content.');
      return;
    }
    setBusy(true);
    try {
      const source = await sourceService.addText(projectId, title.trim(), content.trim());
      addSource(source);
      toast.success('Source added');
      setOpen(false);
      reset();
    } catch {
      setFailReason('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function handleLocal() {
    if (!filePath.trim()) {
      setFailReason('Enter a file path for this mock import.');
      return;
    }
    setBusy(true);
    try {
      const source = await sourceService.add({
        projectId,
        type: 'video',
        title: filePath.split(/[/\\]/).pop() ?? 'Local video',
        metadata: { type: 'video', filePath: filePath.trim(), duration: 198 },
      });
      addSource(source);
      await refreshMedia(projectId);
      toast.success('Source added');
      setOpen(false);
      reset();
    } catch {
      setFailReason('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (tab === 'article') return handleArticle();
    if (tab === 'youtube') return handleYoutube();
    if (tab === 'video') return handleLocal();
    return handlePaste();
  }

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Add Source"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={busy}>
            {tab === 'article' ? 'Fetch article' : tab === 'youtube' ? 'Add video' : 'Save source'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Tabs tabs={TABS} value={tab} onChange={(id) => { setTab(id as SourceType); setFailReason(''); }} />
        {tab === 'article' && (
          <Input
            label="Article URL"
            placeholder="https://"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        )}
        {tab === 'youtube' && (
          <Input
            label="YouTube URL"
            placeholder="https://www.youtube.com/watch?v="
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            hint={busy ? 'Reading video…' : undefined}
          />
        )}
        {tab === 'video' && (
          <Input
            label="File path"
            placeholder="/Users/you/Movies/talk.mp4"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            hint="Phase 1 mocks a local file. No picker yet."
          />
        )}
        {tab === 'text' && (
          <>
            <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Research notes" />
            <Textarea label="Content" rows={8} value={content} onChange={(e) => setContent(e.target.value)} placeholder="Paste the source here." />
          </>
        )}
        {failReason && (
          <div className={styles.fail}>
            <p>{failReason}</p>
            {tab === 'article' && (
              <Button variant="link" onClick={() => { setTab('text'); setFailReason(''); }}>
                Paste it manually
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
