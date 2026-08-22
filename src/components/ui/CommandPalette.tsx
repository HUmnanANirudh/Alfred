import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';
import styles from './CommandPalette.module.css';

type Command = {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
};

export function CommandPalette() {
  const open = useUiStore((s) => s.commandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const setCreate = useUiStore((s) => s.setCreateProjectOpen);
  const setAddSource = useUiStore((s) => s.setAddSourceOpen);
  const { id } = useParams<{ id: string }>();
  const activeId = useProjectStore((s) => s.activeProjectId) ?? id;
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);

  const commands = useMemo<Command[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      setOpen(false);
    };
    const items: Command[] = [
      { id: 'new-project', label: 'Commission a Project', hint: '⌘N', run: () => { setOpen(false); setCreate(true); } },
      { id: 'voices', label: 'Open Voices', run: go(activeId ? `/projects/${activeId}/voices` : '/voices') },
      { id: 'models', label: 'Open Models', run: go(activeId ? `/projects/${activeId}/models` : '/models') },
    ];
    if (activeId) {
      const base = `/projects/${activeId}`;
      items.splice(1, 0,
        { id: 'add-source', label: 'Add Source', hint: '⇧⌘A', run: () => { setOpen(false); setAddSource(true); } },
        { id: 'create-short', label: 'Generate Video', run: go(`${base}/video`) },
        { id: 'generate-audio', label: 'Generate Audio', run: go(`${base}/audio`) },
        { id: 'write-article', label: 'Write Article', run: go(`${base}/writing/article`) },
        { id: 'write-x', label: 'Write X Post', run: go(`${base}/writing/x`) },
        { id: 'write-li', label: 'Write LinkedIn Post', run: go(`${base}/writing/linkedin`) },
      );
    }
    return items;
  }, [activeId, navigate, setAddSource, setCreate, setOpen]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase().trim()),
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setIndex(0);
    }
  }, [open]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        filtered[index]?.run();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filtered, index, open, setOpen]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={() => setOpen(false)}>
      <div className={styles.panel} onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Command palette">
        <input
          className={styles.search}
          autoFocus
          placeholder="Type a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul className={styles.list}>
          {filtered.length === 0 && <li className={styles.empty}>No matching commands</li>}
          {filtered.map((cmd, i) => (
            <li key={cmd.id}>
              <button
                type="button"
                className={cn(styles.item, i === index && styles.active)}
                onMouseEnter={() => setIndex(i)}
                onClick={cmd.run}
              >
                <span>{cmd.label}</span>
                {cmd.hint && <kbd className={styles.hint}>{cmd.hint}</kbd>}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
