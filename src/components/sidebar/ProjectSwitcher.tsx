import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { cn } from '../../utils/cn';
import styles from './ProjectSwitcher.module.css';

interface ProjectSwitcherProps {
  onCreateProject?: () => void;
  onNavigate?: () => void;
}

export function ProjectSwitcher({ onCreateProject, onNavigate }: ProjectSwitcherProps) {
  const { id: currentId } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const projects = useProjectStore((s) => s.projects);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);

  function openProject(id: string) {
    setActiveProject(id);
    const rest = currentId
      ? location.pathname.replace(`/projects/${currentId}`, '')
      : '/video';
    const next = rest && rest !== '/' ? rest : '/video';
    navigate(`/projects/${id}${next}${location.search}`);
    onNavigate?.();
  }

  return (
    <div className={styles.list}>
      {projects.length === 0 && <p className={styles.empty}>No projects yet</p>}
      {projects.map((project) => (
        <button
          key={project.id}
          type="button"
          className={cn(styles.item, project.id === currentId && styles.itemActive)}
          onClick={() => openProject(project.id)}
        >
          {project.name}
        </button>
      ))}
      <button
        type="button"
        className={styles.create}
        onClick={() => {
          onNavigate?.();
          onCreateProject?.();
        }}
      >
        <Plus size={13} />
        New project
      </button>
    </div>
  );
}
