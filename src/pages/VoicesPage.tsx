import { useEffect, useState } from 'react';
import { Mic2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { VoiceTable } from '../components/audio/VoiceTable';
import { AddVoiceModal } from '../components/audio/AddVoiceModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { voiceService } from '../services/voiceService';
import { useWorkspaceStore } from '../store/workspaceStore';
import type { Voice } from '../types';
import styles from './page.module.css';

export function VoicesPage() {
  const voices = useWorkspaceStore((s) => s.voices);
  const setVoices = useWorkspaceStore((s) => s.setVoices);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    voiceService.list().then(setVoices);
  }, [setVoices]);

  return (
    <div className={styles.page}>
      <PageHeader
        title="Voices"
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add voice</Button>}
      />
      {voices.length === 0 ? (
        <EmptyState
          icon={<Mic2 size={40} strokeWidth={1.25} />}
          title="No voices yet"
        />
      ) : (
        <VoiceTable voices={voices as Voice[]} />
      )}
      <AddVoiceModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
