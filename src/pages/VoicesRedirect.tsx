import { Navigate } from 'react-router-dom';
import { useProjectStore } from '../store/projectStore';
import { VoicesPage } from './VoicesPage';

export function VoicesRedirect() {
  const id = useProjectStore((s) => s.activeProjectId ?? s.projects[0]?.id);
  if (id) return <Navigate to={`/projects/${id}/voices`} replace />;
  return <VoicesPage />;
}
