import { useEffect, useState } from 'react';
import type { Source, SourceType } from '../../types';
import { isTauri } from '../../services/ipc';
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

const ALL_TABS = [
  { id: 'article', label: 'Article URL' },
  { id: 'text', label: 'Paste' },
  { id: 'youtube', label: 'YouTube' },
  { id: 'video', label: 'From device' },
];

const TEXT_TABS = [
  { id: 'article', label: 'Article URL' },
  { id: 'text', label: 'Paste' },
];

const VIDEO_TABS = [
  { id: 'youtube', label: 'YouTube' },
  { id: 'video', label: 'From device' },
];

async function refreshLibrary(projectId: string) {
  const [sources, videos, transcripts] = await Promise.all([
    sourceService.list(projectId),
    videoService.list(projectId),
    transcriptService.list(projectId),
  ]);
  const store = useWorkspaceStore.getState();
  store.setSources(sources);
  store.setVideos(videos);
  store.setTranscripts(transcripts);
}

export function AddSourceModal({ projectId }: { projectId: string }) {
  const open = useUiStore((s) => s.addSourceOpen);
  const intake = useUiStore((s) => s.sourceIntake);
  const setOpen = useUiStore((s) => s.setAddSourceOpen);
  const addSource = useWorkspaceStore((s) => s.addSource);
  const [tab, setTab] = useState<SourceType>('article');
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [filePath, setFilePath] = useState('');
  const [busy, setBusy] = useState(false);
  const [failReason, setFailReason] = useState('');

  const tabs = intake === 'video' ? VIDEO_TABS : intake === 'text' ? TEXT_TABS : ALL_TABS;

  useEffect(() => {
    if (!open) return;
    setTab(intake === 'video' ? 'youtube' : 'article');
    setUrl('');
    setTitle('');
    setContent('');
    setFileName('');
    setFilePath('');
    setFailReason('');
  }, [open, intake]);

  function reset() {
    setUrl('');
    setTitle('');
    setContent('');
    setFileName('');
    setFilePath('');
    setFailReason('');
    setBusy(false);
  }

  function close() {
    if (busy) return;
    setOpen(false);
    reset();
  }

  async function handleArticle() {
    setBusy(true);
    setFailReason('');
    try {
      const result = await sourceService.fetchArticle(url.trim());
      if (!result.success) {
        setFailReason(
          result.reason === 'paywall'
            ? 'This article looks gated. Paste the content instead.'
            : 'We couldn\'t read this article. Paste the content instead.',
        );
        toast.error('We couldn\'t add this source. Try pasting the content.');
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

  async function finishVideo(_source: Source) {
    await refreshLibrary(projectId);
    toast.success('Source added');
    setOpen(false);
    reset();
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
            : 'We couldn\'t read this video. Try a local file instead.',
        );
        toast.error('We couldn\'t add this video.');
        return;
      }
      await finishVideo(result.source);
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
    if (!filePath.trim() && !fileName.trim()) {
      setFailReason('Choose a video from this device.');
      return;
    }
    setBusy(true);
    try {
      const path = filePath.trim() || fileName.trim();
      const name = path.split(/[/\\]/).pop() ?? path;
      const source = await sourceService.add({
        projectId,
        type: 'video',
        title: name,
        metadata: { type: 'video', filePath: path },
      });
      await finishVideo(source);
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

  const primaryLabel =
    tab === 'article' ? 'Fetch article'
      : tab === 'youtube' ? 'Add video'
        : tab === 'video' ? 'Add video'
          : 'Save';

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Add source"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          <Button variant="primary" onClick={submit} loading={busy}>{primaryLabel}</Button>
        </>
      }
    >
      <div className={styles.body}>
        <Tabs tabs={tabs} value={tab} onChange={(id) => { setTab(id as SourceType); setFailReason(''); }} />
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
          <div className={styles.filePick}>
            <span>Video file</span>
            <button
              type="button"
              className={styles.fileName}
              onClick={async () => {
                if (isTauri()) {
                  const { open } = await import('@tauri-apps/plugin-dialog');
                  const selected = await open({
                    multiple: false,
                    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'm4v'] }],
                  });
                  if (typeof selected === 'string' && selected) {
                    setFilePath(selected);
                    setFileName(selected.split(/[/\\]/).pop() ?? selected);
                  }
                  return;
                }
                document.getElementById('alfred-local-video')?.click();
              }}
            >
              {fileName || 'Choose a file from this device'}
            </button>
            <input
              id="alfred-local-video"
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                setFileName(file?.name ?? '');
                setFilePath(file?.name ?? '');
              }}
            />
          </div>
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
                Paste it instead
              </Button>
            )}
            {tab === 'youtube' && (
              <Button variant="link" onClick={() => { setTab('video'); setFailReason(''); }}>
                Choose a local file
              </Button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
