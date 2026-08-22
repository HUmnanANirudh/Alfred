import { useEffect, useState } from 'react';
import { Play, Square } from 'lucide-react';
import type { Voice } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import styles from './VoiceTable.module.css';

const SAMPLE = 'Your research should never leave this machine.';

function previewVoice(voice: Voice) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(SAMPLE);
  utter.rate = 0.96;
  utter.pitch = voice.isCloned ? 0.85 : voice.name.length % 2 === 0 ? 1.08 : 0.95;
  window.speechSynthesis.speak(utter);
  return utter;
}

export function VoiceTable({
  voices,
  selectedId,
  onSelect,
}: {
  voices: Voice[];
  selectedId?: string;
  onSelect?: (id: string) => void;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    };
  }, []);

  function togglePreview(voice: Voice) {
    if (playingId === voice.id) {
      window.speechSynthesis.cancel();
      setPlayingId(null);
      return;
    }
    const utter = previewVoice(voice);
    if (!utter) return;
    setPlayingId(voice.id);
    utter.onend = () => setPlayingId((current) => (current === voice.id ? null : current));
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Name</th>
          <th>Kind</th>
          <th>Preview</th>
        </tr>
      </thead>
      <tbody>
        {voices.map((voice) => {
          const selected = voice.id === selectedId;
          return (
            <tr
              key={voice.id}
              className={cn(onSelect && styles.rowPick, selected && styles.rowOn)}
              onClick={() => onSelect?.(voice.id)}
            >
              <td>
                <span className={styles.name}>{voice.name}</span>
                {voice.isDefault && <Badge variant="accent">Default</Badge>}
              </td>
              <td>{voice.isCloned ? 'Clone' : 'Built-in'}</td>
              <td>
                <Button
                  size="sm"
                  variant="ghost"
                  leftIcon={playingId === voice.id ? <Square size={12} /> : <Play size={12} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePreview(voice);
                  }}
                >
                  {playingId === voice.id ? 'Stop' : 'Preview'}
                </Button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
