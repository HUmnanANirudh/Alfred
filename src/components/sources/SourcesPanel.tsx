import { Link, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { formatDate } from '../../utils/format';
import { Button } from '../ui/Button';
import styles from './SourcesPanel.module.css';

function sourceKind(type: string) {
  if (type === 'youtube' || type === 'video') return 'video';
  return type;
}

export function SourcesPanel() {
  const { id } = useParams<{ id: string }>();
  const sources = useWorkspaceStore((s) => s.sources);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);

  if (!id) return null;

  return (
    <aside className={styles.panel} aria-label="Sources">
      <div className={styles.head}>
        <h2 className={styles.title}>Sources</h2>
        <Button variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setAdd(true)}>
          Add
        </Button>
      </div>
      <div className={styles.list}>
        {sources.map((source) => (
          <Link key={source.id} to={`/projects/${id}/sources/${source.id}`} className={styles.item}>
            <span className={styles.title}>{source.title}</span>
            <div className={styles.meta}>
              <span className={styles.name}>{source.title}</span>
              <span className={styles.sub}>{sourceKind(source.type)} · {formatDate(source.createdAt)}</span>
            </div>
          </Link>
        ))}
      </div>
    </aside>
  );
}
