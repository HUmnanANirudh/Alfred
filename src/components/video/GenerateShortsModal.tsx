import { useEffect, useState } from 'react';
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
  const [captions, setCaptions] = useState(true);
  const [captionStyle, setCaptionStyle] = useState('clean');

  useEffect(() => {
    shortService.getPresets().then((list) => {
      setPresets(list);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCaptions(true);
    setCaptionStyle('clean');
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
            disabled={!video}
            onClick={() => onGenerate({
              presetId: presets[0]?.id || 'preset_1',
              captionsEnabled: captions,
              captionStyle,
              numberOfClips: 10,
            })}
          >
            Generate shorts
          </Button>
        </>
      )}
    >
      <div className={styles.body}>
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
        </div>
      </div>
    </Modal>
  );
}
