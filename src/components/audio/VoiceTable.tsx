import { useEffect, useState, useRef } from 'react';
import { Play, Square } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { assetUrl } from '../../services/ipc';
import type { Voice } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import styles from './VoiceTable.module.css';

const SAMPLE = 'Your research should never leave this machine.';

import { toast } from '../../store/toastStore';

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
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  async function togglePreview(voice: Voice) {
    if (playingId === voice.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      setPlayingId(null);
      return;
    }
    
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    
    setLoadingId(voice.id);
    setPlayingId(null);
    try {
      const path = await invoke<string>('preview_tts', { 
        voiceId: voice.id, 
        script: SAMPLE 
      });
      const url = await assetUrl(path);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingId(null);
      };
      
      await audio.play();
      setPlayingId(voice.id);
    } catch (e: any) {
      console.error('Failed to play preview:', e);
      toast.error(e?.toString() || 'Failed to generate preview. Make sure the TTS model is installed.');
      setPlayingId(null);
    } finally {
      setLoadingId(null);
    }
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
                  loading={loadingId === voice.id}
                  disabled={loadingId === voice.id}
                  leftIcon={playingId === voice.id ? <Square size={12} /> : <Play size={12} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    void togglePreview(voice);
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
