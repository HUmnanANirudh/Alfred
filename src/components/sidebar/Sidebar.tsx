import { useState } from 'react';
import { Plus } from 'lucide-react';
import { NavItem } from './NavItem';
import { ProjectSwitcher } from './ProjectSwitcher';
import { AddVoiceModal } from '../audio/AddVoiceModal';
import { Button } from '../ui/Button';
import { useWorkspaceStore } from '../../store/workspaceStore';
import styles from './Sidebar.module.css';

interface SidebarProps {
  onCreateProject?: () => void;
}

export function Sidebar({ onCreateProject }: SidebarProps) {
  const voices = useWorkspaceStore((s) => s.voices);
  const [addVoice, setAddVoice] = useState(false);

  return (
    <aside className={styles.sidebar}>
      <div className={styles.wordmark}>ALFRED</div>
      <div className={styles.switcher}>
        <ProjectSwitcher onCreateProject={onCreateProject} />
      </div>
      <div className={styles.spacer} />
      <div className={styles.divider} />
      <div className={styles.voices}>
        <div className={styles.voicesHead}>
          <span className={styles.voicesLabel}>Voices</span>
          <Button variant="ghost" size="sm" leftIcon={<Plus size={12} />} onClick={() => setAddVoice(true)}>
            Add
          </Button>
        </div>
        <nav className={styles.nav}>
          {voices.slice(0, 6).map((voice) => (
            <NavItem key={voice.id} label={voice.name} to="/voices" />
          ))}
          {voices.length === 0 && (
            <p className={styles.voicesEmpty}>No voices yet</p>
          )}
        </nav>
      </div>
      <AddVoiceModal isOpen={addVoice} onClose={() => setAddVoice(false)} />
    </aside>
  );
}
