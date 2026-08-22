import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { StatusBar } from '../components/layout/StatusBar';
import { CreateProjectModal } from '../components/layout/CreateProjectModal';
import { CommandPalette } from '../components/ui/CommandPalette';
import { ToastViewport } from '../components/ui/Toast';
import { useUiStore } from '../store/uiStore';
import styles from './AppShell.module.css';

export function AppShell() {
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);
  const setCreate = useUiStore((s) => s.setCreateProjectOpen);
  const setAddSource = useUiStore((s) => s.setAddSourceOpen);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
      if (mod && e.key.toLowerCase() === 'n' && !e.shiftKey) {
        e.preventDefault();
        setCreate(true);
      }
      if (mod && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setAddSource(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setAddSource, setCommandOpen, setCreate]);

  return (
    <div className={styles.shell}>
      <div className={styles.content}>
        <Outlet />
      </div>
      <StatusBar />
      <ToastViewport />
      <CommandPalette />
      <CreateProjectModal />
    </div>
  );
}
