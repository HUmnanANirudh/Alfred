import { Navigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { ModelsPage } from './ModelsPage';

export function ModelsRedirect() {
  const id = useProjectStore((s) => s.activeProjectId ?? s.projects[0]?.id);
  if (id) return <Navigate to={`/projects/${id}/models`} replace />;
  return <ModelsPage />;
}
