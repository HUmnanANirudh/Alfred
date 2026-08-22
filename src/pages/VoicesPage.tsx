import { useEffect, useState } from 'react';
import { Mic2 } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { VoiceCard } from '../components/audio/VoiceCard';
import { AddVoiceModal } from '../components/audio/AddVoiceModal';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
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
        description="Global voices. Clones stay on this device."
        actions={<Button variant="primary" onClick={() => setOpen(true)}>Add voice</Button>}
      />
      <p className={styles.muted} style={{ marginBottom: 16 }}>
        <Badge variant="success">stays on device</Badge>
      </p>
      {voices.length === 0 ? (
        <EmptyState
          icon={<Mic2 size={40} strokeWidth={1.25} />}
          title="No voices yet"
          description="Alfred ships with defaults once the voice list loads."
        />
      ) : (
        <div className={styles.grid}>
          {voices.map((voice: Voice) => (
            <VoiceCard key={voice.id} voice={voice} />
          ))}
        </div>
      )}
      <AddVoiceModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
}
