import type { VideoPreset } from '../../types';
import { cn } from '../../utils/cn';
import styles from './PresetCard.module.css';

const DIAGRAM: Record<VideoPreset['layout'], string> = {
  full_screen: 'FULL\nVIDEO',
  captions_focus: 'FACE\n—— captions ——',
  split_screen: 'CAM | GAME',
  podcast: 'A  |  B',
  speaker_background: 'SPEAKER\nbg fill',
  speaker_gameplay: 'CAM\ngameplay',
  custom: 'CUSTOM',
};

export function PresetCard({
  preset,
  selected,
  onSelect,
}: {
  preset: VideoPreset;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button type="button" className={cn(styles.card, selected && styles.selected)} onClick={onSelect}>
      <div className={cn(styles.preview, preset.aspectRatio === '1:1' && styles.square)}>
        {DIAGRAM[preset.layout]}
      </div>
      <strong className={styles.name}>{preset.name}</strong>
    </button>
  );
}
