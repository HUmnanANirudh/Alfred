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
  variant?: 'all' | 'audio';
  emptyAction?: { label: string; onClick: () => void };
}

function audioKind(source: Source) {
  if (source.type === 'youtube' || source.type === 'video') return 'Transcript';
  if (source.type === 'article') return 'Article';
  return 'Text';
}

export function SourceSelector({ selected, onChange, filterTypes, variant = 'all', emptyAction }: Props) {
  const sources = useWorkspaceStore((s) => s.sources);
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sources.filter((s) => {
      if (filterTypes && !filterTypes.includes(s.type)) return false;
      if (!q) return true;
      const kind = variant === 'audio' ? audioKind(s) : s.type;
      return s.title.toLowerCase().includes(q)
        || kind.toLowerCase().includes(q)
        || (s.excerpt?.toLowerCase().includes(q) ?? false);
    });
  }, [filterTypes, query, sources, variant]);

  const visibleIds = items.map((s) => s.id);

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id));
    else onChange([...selected, id]);
  }

  if (items.length === 0 && !query) {
    return (
      <div className={styles.emptyBox}>
        {emptyAction && (
          <Button variant="secondary" size="sm" onClick={emptyAction.onClick}>
            {emptyAction.label}
          </Button>
        )}
      </div>
    );
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
          const asTranscript = variant === 'audio' && (source.type === 'youtube' || source.type === 'video');
          return (
            <button
              key={source.id}
              type="button"
              className={cn(styles.item, on && styles.on)}
              onClick={() => toggle(source.id)}
            >
              <SourceIcon type={asTranscript ? 'text' : source.type} />
              <span className={styles.title}>{source.title}</span>
              {variant === 'audio' && <span className={styles.kind}>{audioKind(source)}</span>}
              <span className={styles.check} aria-hidden>{on ? '✓' : ''}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
