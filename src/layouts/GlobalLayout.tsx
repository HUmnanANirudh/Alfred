import { NavLink, Outlet } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import styles from './GlobalLayout.module.css';

export function GlobalLayout() {
  const activeId = useProjectStore((s) => s.activeProjectId);
  const projects = useProjectStore((s) => s.projects);
  const fallback = activeId ?? projects[0]?.id;

  return (
    <div className={styles.layout}>
      <aside className={styles.aside}>
        <div className={styles.wordmark}>ALFRED</div>
        {fallback && <NavLink to={`/projects/${fallback}`} className={styles.link}>Back to project</NavLink>}
        <NavLink to="/" className={styles.link}>Workspace</NavLink>
        <NavLink to="/voices" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>Voices</NavLink>
      </aside>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}
