import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { WorkspaceHeader } from '../components/layout/WorkspaceHeader';
import { AddSourceModal } from '../components/sources/AddSourceModal';
import { SourcesPanel } from '../components/sources/SourcesPanel';
import { useProjectStore } from '../store/projectStore';
import { useUiStore } from '../store/uiStore';
import { hydrateWorkspace } from '../store/hydrate';
import styles from './ProjectLayout.module.css';

export function ProjectLayout() {
  const { id: projectId } = useParams<{ id: string }>();
  const setActiveProject = useProjectStore((s) => s.setActiveProject);
  const setCreate = useUiStore((s) => s.setCreateProjectOpen);

  useEffect(() => {
    if (projectId) {
      setActiveProject(projectId);
      void hydrateWorkspace(projectId);
    }
  }, [projectId, setActiveProject]);

  return (
    <div className={styles.layout}>
      <Sidebar onCreateProject={() => setCreate(true)} />
      <div className={styles.center}>
        <WorkspaceHeader />
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
      <SourcesPanel />
      {projectId && <AddSourceModal projectId={projectId} />}
    </div>
  );
}
