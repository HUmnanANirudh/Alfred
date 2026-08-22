import { NavLink, useLocation, useParams } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { useUiStore } from '../../store/uiStore';
import { cn } from '../../utils/cn';
import styles from './WorkspaceHeader.module.css';

export function WorkspaceHeader() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));
  const menuOpen = useUiStore((s) => s.menuOpen);
  const setMenuOpen = useUiStore((s) => s.setMenuOpen);

  if (!id) return null;

  const base = `/projects/${id}`;
  const path = location.pathname;
  const onVideo = path.includes(`${base}/video`);
  const onWriting = path.includes(`${base}/writing`);
  const onAudio = path.includes(`${base}/audio`);

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <button
          type="button"
          className={styles.hamburger}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <Menu size={18} />
        </button>
        <h1 className={styles.project}>{project?.name ?? 'Project'}</h1>
      </div>
      <nav className={styles.primary} aria-label="Workspace">
        <NavLink to={`${base}/video`} className={cn(styles.tab, onVideo && styles.tabOn)}>Video</NavLink>
        <NavLink to={`${base}/audio`} className={cn(styles.tab, onAudio && styles.tabOn)}>Audio</NavLink>
        <NavLink to={`${base}/writing/article`} className={cn(styles.tab, onWriting && styles.tabOn)}>Writing</NavLink>
      </nav>
      {onWriting && (
        <nav className={styles.sub} aria-label="Writing">
          <NavLink to={`${base}/writing/article`} className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>Article</NavLink>
          <NavLink to={`${base}/writing/x`} className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>X</NavLink>
          <NavLink to={`${base}/writing/linkedin`} className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>LinkedIn</NavLink>
        </nav>
      )}
    </header>
  );
}
