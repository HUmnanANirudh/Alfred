import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Plus } from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import styles from './ProjectSwitcher.module.css';

interface ProjectSwitcherProps {
  onCreateProject?: () => void;
}

export function ProjectSwitcher({ onCreateProject }: ProjectSwitcherProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const projects = useProjectStore((s) => s.projects);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const displayName = activeProject?.name ?? 'Select Project';

  const toggleOpen = useCallback(() => setIsOpen((prev) => !prev), []);

  const handleSelectProject = useCallback(
    (id: string) => {
      setActiveProject(id);
      navigate(`/projects/${id}`);
      setIsOpen(false);
    },
    [navigate, setActiveProject],
  );

  const handleCreateProject = useCallback(() => {
    setIsOpen(false);
    onCreateProject?.();
  }, [onCreateProject]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={styles.wrapper} ref={dropdownRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={styles.projectName}>{displayName}</span>
        <ChevronDown
          size={14}
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
        />
      </button>

      {isOpen && (
        <div className={styles.dropdown} role="listbox">
          {projects.length === 0 && (
            <div className={styles.empty}>No projects yet</div>
          )}
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              role="option"
              aria-selected={project.id === activeProjectId}
              className={`${styles.dropdownItem} ${project.id === activeProjectId ? styles.dropdownItemActive : ''}`}
              onClick={() => handleSelectProject(project.id)}
            >
              <span className={styles.dropdownItemName}>{project.name}</span>
              {project.id === activeProjectId && (
                <span className={styles.activeDot} aria-hidden="true" />
              )}
            </button>
          ))}

          <div className={styles.divider} role="separator" />

          <button
            type="button"
            className={styles.createItem}
            onClick={handleCreateProject}
          >
            <Plus size={13} />
            <span>Commission Project</span>
          </button>
        </div>
      )}
    </div>
  );
}
