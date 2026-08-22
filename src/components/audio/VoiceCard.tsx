import type { Voice } from '../../types';
import { cn } from '../../utils/cn';
import { Badge } from '../ui/Badge';
import styles from './VoiceCard.module.css';

export function VoiceCard({
  voice,
  selected,
  onSelect,
}: {
  voice: Voice;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button type="button" className={cn(styles.card, selected && styles.selected)} onClick={onSelect}>
      <div className={styles.row}>
        <strong>{voice.name}</strong>
        {voice.isDefault && <Badge variant="accent">Default</Badge>}
        {voice.isCloned && <Badge>On device clone</Badge>}
      </div>
      <p className={styles.engine}>{voice.engine.replace(/_/g, ' ')}</p>
    </button>
  );
}
