import { useEffect } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { Mic2 } from 'lucide-react';
import { ProjectSwitcher } from '../sidebar/ProjectSwitcher';
import { useUiStore } from '../../store/uiStore';
import styles from './AppMenu.module.css';

export function AppMenu() {
  const open = useUiStore((s) => s.menuOpen);
  const setOpen = useUiStore((s) => s.setMenuOpen);
  const setCreate = useUiStore((s) => s.setCreateProjectOpen);
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  if (!open) return null;

  const voicesTo = id ? `/projects/${id}/voices` : '/voices';

  return (
    <div className={styles.overlay} onMouseDown={() => setOpen(false)}>
      <aside className={styles.drawer} onMouseDown={(e) => e.stopPropagation()} aria-label="Menu">
        <div className={styles.wordmark}>ALFRED</div>
        <div className={styles.switcher}>
          <ProjectSwitcher onCreateProject={() => { setOpen(false); setCreate(true); }} />
        </div>
        <nav className={styles.nav}>
          <NavLink
            to={voicesTo}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
            onClick={() => setOpen(false)}
          >
            <Mic2 size={14} />
            Voices
          </NavLink>
        </nav>
      </aside>
    </div>
  );
}
