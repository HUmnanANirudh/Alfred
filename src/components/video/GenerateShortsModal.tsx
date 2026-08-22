import { useEffect, useState } from 'react';
import { PresetSelector } from './PresetSelector';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Select } from '../ui/Select';
import { shortService } from '../../services/shortService';
import type { Video, VideoPreset } from '../../types';
import styles from './GenerateShortsModal.module.css';

export function GenerateShortsModal({
  isOpen,
  onClose,
  video,
  busy,
  onGenerate,
}: {
  isOpen: boolean;
  onClose: () => void;
  video: Video | undefined;
  busy: boolean;
  onGenerate: (config: {
    presetId: string;
    captionsEnabled: boolean;
    captionStyle: string;
    numberOfClips: number;
  }) => void;
}) {
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [presetId, setPresetId] = useState('');
  const [captions, setCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('clean');
  const [count, setCount] = useState(3);

  useEffect(() => {
    shortService.getPresets().then((list) => {
      setPresets(list);
      setPresetId((current) => current || list[0]?.id || '');
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCaptions(true);
    setCaptionStyle('clean');
    setCount(3);
    setPresetId((current) => current || presets[0]?.id || '');
  }, [isOpen, presets]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => { if (!busy) onClose(); }}
      title="Generate shorts"
      size="xl"
      footer={(
        <>
          <Button variant="ghost" disabled={busy} onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            loading={busy}
            disabled={!presetId || !video}
            onClick={() => onGenerate({
              presetId,
              captionsEnabled: captions,
              captionStyle,
              numberOfClips: count,
            })}
          >
            Generate shorts
          </Button>
        </>
      )}
    >
      <div className={styles.body}>
        <PresetSelector presets={presets} value={presetId} onChange={setPresetId} />
        <div className={styles.controls}>
          <Select label="Captions" value={captions ? 'on' : 'off'} onChange={(e) => setCaptions(e.target.value === 'on')}>
            <option value="on">On</option>
            <option value="off">Off</option>
          </Select>
          <Select label="Caption style" value={captionStyle} onChange={(e) => setCaptionStyle(e.target.value)}>
            <option value="clean">Clean</option>
            <option value="bold">Bold</option>
            <option value="karaoke">Karaoke</option>
          </Select>
          <Select label="Number of clips" value={String(count)} onChange={(e) => setCount(Number(e.target.value))}>
            <option value="1">1</option>
            <option value="3">3</option>
            <option value="5">5</option>
          </Select>
        </div>
      </div>
    </Modal>
  );
}
