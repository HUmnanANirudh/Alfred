import { useEffect, useRef, useState } from 'react';
import { Music } from 'lucide-react';
import { assetUrl } from '../../services/ipc';
import { formatDuration } from '../../utils/format';
import { Button } from '../ui/Button';
import styles from './AudioPlayer.module.css';

export function AudioPlayer({
  filePath,
  title,
  duration,
}: {
  filePath: string;
  title?: string;
  duration?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration ?? 0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [srcUrl, setSrcUrl] = useState('');

  useEffect(() => {
    if (!filePath) return;
    let active = true;
    assetUrl(filePath).then((url) => {
      if (active) {
        setSrcUrl(url);
      }
    });
    setIsPlaying(false);
    setCurrentTime(0);
    return () => {
      active = false;
    };
  }, [filePath]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
    };
  }, [srcUrl]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch((err) => console.error('Playback error:', err));
    }
  };

  const seek = (time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(time, totalDuration));
    setCurrentTime(audio.currentTime);
  };

  const skip = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    seek(audio.currentTime + delta);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (v: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = v;
    setVolume(v);
    setIsMuted(v === 0);
  };

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className={styles.container}>
      <audio ref={audioRef} src={srcUrl} preload="metadata" />

      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.iconBox}>
            <Music size={18} className={isPlaying ? styles.iconPulse : ''} />
          </div>
          <div>
            <h4 className={styles.title}>{title || 'Synthesized Audio'}</h4>
            <span className={styles.badge}>24 kHz · Mono WAV</span>
          </div>
        </div>

        <div className={styles.waveVisualizer} aria-hidden>
          {Array.from({ length: 24 }).map((_, i) => {
            const height = isPlaying
              ? Math.max(15, (Math.sin((currentTime * 5) + i * 0.8) * 40) + 50)
              : 25 + ((i * 13) % 45);
            return (
              <span
                key={i}
                className={isPlaying ? styles.waveBarActive : styles.waveBar}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Progress scrubber */}
      <div className={styles.progressRow}>
        <span className={styles.timeText}>{formatDuration(currentTime)}</span>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            min="0"
            max={totalDuration || 1}
            step="0.05"
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className={styles.slider}
            style={{
              background: `linear-gradient(to right, var(--color-accent) ${progressPercent}%, var(--color-border) ${progressPercent}%)`,
            }}
          />
        </div>
        <span className={styles.timeText}>{formatDuration(totalDuration)}</span>
      </div>

      {/* Controls */}
      <div className={styles.controlsRow}>
        <div className={styles.centerControls}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skip(-5)}
            title="Rewind 5 seconds"
          >
            -5s
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={togglePlay}
            title={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            {isPlaying ? 'Pause' : 'Play'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => skip(5)}
            title="Forward 5 seconds"
          >
            +5s
          </Button>
        </div>

        <div className={styles.volumeArea}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleMute}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted || volume === 0 ? 'Muted' : 'Mute'}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className={styles.volSlider}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
