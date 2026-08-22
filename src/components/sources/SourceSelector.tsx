import { useMemo, useState } from 'react';
import type { Source, SourceType } from '../../types';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SourceIcon } from './SourceIcon';
import styles from './SourceSelector.module.css';

interface Props {
  projectId: string;
  selected: string[];
  onChange: (ids: string[]) => void;
  filterTypes?: SourceType[];
  variant?: 'all' | 'audio' | 'video';
  emptyAction?: { label: string; onClick: () => void };
}

function kindLabel(source: Source) {
  if (source.type === 'transcript') return 'Transcript';
  if (source.type === 'youtube' || source.type === 'video') return 'Video';
  if (source.type === 'article') return 'Article';
  return 'Text';
}

export function SourceSelector({ selected, onChange, filterTypes, variant = 'all', emptyAction }: Props) {
  const sources = useWorkspaceStore((s) => s.sources);
  const [query, setQuery] = useState('');

  const allowed = useMemo(() => {
    if (filterTypes) return filterTypes;
    if (variant === 'audio') return ['article', 'text', 'transcript'] as SourceType[];
    if (variant === 'video') return ['youtube', 'video'] as SourceType[];
    return undefined;
  }, [filterTypes, variant]);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (allowed && !allowed.includes(s.type)) return false;
      if (!q) return true;
      return s.title.toLowerCase().includes(q)
        || kindLabel(s).toLowerCase().includes(q)
        || (s.excerpt?.toLowerCase().includes(q) ?? false);
    });
  }, [allowed, query, sources]);

  const visibleIds = items.map((s) => s.id);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  const addButton = emptyAction ? (
    <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
      {emptyAction.label}
    </Button>
  ) : null;

  if (items.length === 0 && !query) {
    return <div className={styles.emptyBox}>{addButton}</div>;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <div className={styles.actions}>
          <Button variant="ghost" size="sm" onClick={() => onChange(visibleIds)}>Select all</Button>
          <Button variant="ghost" size="sm" onClick={() => onChange([])}>Clear</Button>
        </div>
      </div>
      <Input placeholder="Search sources…" value={query} onChange={(e) => setQuery(e.target.value)} />
      <div className={styles.list}>
        {items.length === 0 && <p className={styles.empty}>No sources match that search.</p>}
        {items.map((source) => {
          const on = selected.includes(source.id);
          return (
            <button
              key={source.id}
              type="button"
              className={cn(styles.item, on && styles.on)}
              onClick={() => toggle(source.id)}
            >
              <span className={styles.typeLabel}>{source.type}</span>
              <span className={styles.title}>{source.title}</span>
              <span className={styles.kind}>{kindLabel(source)}</span>
              <span className={styles.check} aria-hidden>{on ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>
      {addButton}
    </div>
  );
}
