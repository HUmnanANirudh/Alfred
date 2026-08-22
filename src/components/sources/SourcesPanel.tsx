import { Link, useLocation, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useUiStore, type SourceIntake } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { formatDate } from '../../utils/format';
import { Button } from '../ui/Button';
import { SourceIcon } from './SourceIcon';
import styles from './SourcesPanel.module.css';

function intakeFromPath(path: string): SourceIntake {
  return path.includes('/writing') ? 'writing' : 'video';
}

export function SourcesPanel() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const sources = useWorkspaceStore((s) => s.sources);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const onAudio = location.pathname.includes('/audio');
  const intake = intakeFromPath(location.pathname);
  const visible = sources.filter((s) =>
    intake === 'writing' ? s.type === 'article' || s.type === 'text' : s.type === 'youtube' || s.type === 'video',
  );

  if (!id) return null;

  return (
    <aside className={styles.panel} aria-label="Sources">
      <div className={styles.head}>
        <div>
          <h2 className={styles.title}>Sources</h2>
          <p className={styles.count}>
            {onAudio
              ? 'Not used for audio'
              : intake === 'writing'
                ? 'Article URL or pasted text'
                : 'YouTube or files from this device'}
          </p>
        </div>
        {!onAudio && (
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setAdd(true, intake)}
          >
            Add
          </Button>
        )}
      </div>
      <div className={styles.list}>
        {!onAudio && visible.length === 0 && (
          <p className={styles.empty}>
            {intake === 'writing'
              ? 'Add an article URL or paste content.'
              : 'Add a YouTube URL or a video from this device.'}
          </p>
        )}
        {onAudio && (
          <p className={styles.empty}>Generate audio from a script and a voice. Sources stay in Video and Writing.</p>
        )}
        {!onAudio && visible.map((source) => (
          <Link key={source.id} to={`/projects/${id}/sources/${source.id}`} className={styles.item}>
            <SourceIcon type={source.type} />
            <div className={styles.meta}>
              <span className={styles.name}>{source.title}</span>
              <span className={styles.sub}>{source.type} · {formatDate(source.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
