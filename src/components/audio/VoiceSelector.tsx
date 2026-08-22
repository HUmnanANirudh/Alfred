import { useEffect, useState } from 'react';
import type { Voice } from '../../types';
import { voiceService } from '../../services/voiceService';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { VoiceCard } from './VoiceCard';
import styles from './VoiceSelector.module.css';

export function VoiceSelector({
  isOpen,
  onClose,
  value,
  onConfirm,
}: {
  isOpen: boolean;
  onClose: () => void;
  value?: string;
  onConfirm: (voiceId: string) => void;
}) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selected, setSelected] = useState(value);

  useEffect(() => {
    if (!isOpen) return;
    voiceService.list().then((list) => {
      setVoices(list);
      setSelected((current) => current ?? value ?? list[0]?.id);
    });
  }, [isOpen, value]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Choose a voice"
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            disabled={!selected}
            onClick={() => selected && onConfirm(selected)}
          >
            Use voice
          </Button>
        </>
      }
    >
      <div className={styles.grid}>
        {voices.map((voice) => (
          <VoiceCard
            key={voice.id}
            voice={voice}
            selected={voice.id === selected}
            onSelect={() => setSelected(voice.id)}
          />
        ))}
      </div>
    </Modal>
  );
}
