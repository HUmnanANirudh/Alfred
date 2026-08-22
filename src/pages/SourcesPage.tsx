import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Library } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { SourceCard } from '../components/sources/SourceCard';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useUiStore } from '../store/uiStore';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { SourceType } from '../types';
import styles from './page.module.css';

export function SourcesPage() {
  const { id } = useParams<{ id: string }>();
  const sources = useWorkspaceStore((s) => s.sources);
  const setAdd = useUiStore((s) => s.setAddSourceOpen);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | SourceType>('all');

  const filtered = useMemo(() => {
    return sources.filter((s) => {
      const matchType = type === 'all' || s.type === type;
      const q = query.trim().toLowerCase();
      const matchQ = !q || s.title.toLowerCase().includes(q) || (s.excerpt?.toLowerCase().includes(q) ?? false);
      return matchType && matchQ;
    });
  }, [query, sources, type]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Sources"
        actions={<Button variant="primary" onClick={() => setAdd(true)}>Add source</Button>}
      />
      <div className={styles.toolbar}>
        <Input placeholder="Search sources" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value as 'all' | SourceType)}>
          <option value="all">All types</option>
          <option value="article">Article</option>
          <option value="youtube">YouTube</option>
          <option value="video">Local video</option>
          <option value="text">Pasted</option>
        </Select>
      </div>
      {sources.length === 0 ? (
        <EmptyState
          icon={<Library size={40} strokeWidth={1.25} />}
          title="Your project has no sources yet"
          actionLabel="Add source"
          onAction={() => setAdd(true)}
        />
      ) : (
        <div className={styles.stack}>
          {filtered.map((source) => (
            <SourceCard key={source.id} source={source} to={`/projects/${id}/sources/${source.id}`} />
          ))}
          {filtered.length === 0 && <p className={styles.muted}>No sources match that filter.</p>}
        </div>
      )}
    </div>
  );
}
