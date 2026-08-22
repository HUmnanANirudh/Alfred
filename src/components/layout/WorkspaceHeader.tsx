import { NavLink, useLocation, useParams } from 'react-router-dom';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';
import styles from './WorkspaceHeader.module.css';

export function WorkspaceHeader() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const project = useProjectStore((s) => s.projects.find((p) => p.id === id));

  if (!id) return null;

  const base = `/projects/${id}`;
  const path = location.pathname;
  const onVideo = path.includes(`${base}/video`);
  const onWriting = path.includes(`${base}/writing`);
  const onAudio = path.includes(`${base}/audio`);

  return (
    <header className={styles.header}>
      <h1 className={styles.project}>{project?.name ?? 'Project'}</h1>
      <nav className={styles.primary} aria-label="Workspace">
        <NavLink to={`${base}/video`} className={cn(styles.tab, onVideo && styles.tabOn)}>Video</NavLink>
        <NavLink to={`${base}/audio`} className={cn(styles.tab, onAudio && styles.tabOn)}>Audio</NavLink>
        <NavLink to={`${base}/writing/article`} className={cn(styles.tab, onWriting && styles.tabOn)}>Writing</NavLink>
      </nav>
      {onVideo && (
        <nav className={styles.sub} aria-label="Video">
          <NavLink to={`${base}/video`} end className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>Videos</NavLink>
          <NavLink to={`${base}/video/shorts`} className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>Shorts</NavLink>
          <NavLink to={`${base}/video/transcripts`} className={({ isActive }) => cn(styles.subLink, isActive && styles.subOn)}>Transcripts</NavLink>
        </nav>
      )}
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
