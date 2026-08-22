import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { projectService } from './services/projectService';
import { voiceService } from './services/voiceService';
import { useProjectStore } from './store/projectStore';
import { useWorkspaceStore } from './store/workspaceStore';
import './styles/global.css';

export default function App() {
  const setProjects = useProjectStore((s) => s.setProjects);
  const setLoaded = useProjectStore((s) => s.setLoaded);
  const setVoices = useWorkspaceStore((s) => s.setVoices);

  useEffect(() => {
    let cancelled = false;
    Promise.all([projectService.list(), voiceService.list()]).then(([projects, voices]) => {
      if (cancelled) return;
      setProjects(projects);
      setVoices(voices);
      setLoaded(true);
    });
    return () => { cancelled = true; };
  }, [setLoaded, setProjects, setVoices]);

  return <RouterProvider router={router} />;
}
