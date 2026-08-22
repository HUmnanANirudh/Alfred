import type { VideoPreset } from '../../types';
import { PresetCard } from './PresetCard';
import styles from './PresetSelector.module.css';

export function PresetSelector({
  presets,
  value,
  onChange,
}: {
  presets: VideoPreset[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className={styles.grid}>
      {presets.map((preset) => (
        <PresetCard
          key={preset.id}
          preset={preset}
          selected={preset.id === value}
          onSelect={() => onChange(preset.id)}
        />
      ))}
    </div>
  );
}
