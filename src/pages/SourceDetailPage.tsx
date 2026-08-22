import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../components/layout/PageHeader';
import { SourceIcon } from '../components/sources/SourceIcon';
import { Button } from '../components/ui/Button';
import { sourceService } from '../services/sourceService';
import { toast } from '../store/toastStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import { formatDate, formatWordCount } from '../utils/format';
import styles from './page.module.css';

export function SourceDetailPage() {
  const { id, srcId } = useParams<{ id: string; srcId: string }>();
  const source = useWorkspaceStore((s) => s.sources.find((x) => x.id === srcId));
  const removeSource = useWorkspaceStore((s) => s.removeSource);
  const navigate = useNavigate();

  async function handleDelete() {
    if (!srcId) return;
    await sourceService.delete(srcId);
    removeSource(srcId);
    toast.info('Source removed');
    navigate(`/projects/${id}/sources`);
  }

  if (!source) {
    return (
      <div className={styles.page}>
        <p className={styles.muted}>We couldn&apos;t find that source.</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title={source.title}
        description={source.url ?? source.type}
        actions={
          <>
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/writing/article`)}>Write article</Button>
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/video/shorts`)}>Create short</Button>
            <Button variant="secondary" onClick={() => navigate(`/projects/${id}/audio`)}>Generate audio</Button>
            <Button variant="danger" onClick={handleDelete}>Delete</Button>
          </>
        }
      />
      <p className={styles.muted} style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        <SourceIcon type={source.type} />
        <span>{source.type}</span>
        {source.wordCount != null && <span>{formatWordCount(source.wordCount)}</span>}
        <span>{formatDate(source.createdAt)}</span>
      </p>
      <div className={styles.card}>
        <p className={styles.prose}>{source.content ?? 'No extracted text for this source.'}</p>
      </div>
    </div>
  );
}
