import React, { useCallback, useEffect, useRef, useState } from 'react';
import { modelService } from '../../services/modelService';
import type { EngineHealth } from '../../types';
import styles from './StatusBar.module.css';

interface ProcessingInfo {
  label: string;
  value: string;
}

const PROCESSING_INFO: ProcessingInfo[] = [
  { label: 'AI inference', value: 'On device' },
  { label: 'Media processing', value: 'On device' },
  { label: 'Project data', value: 'Local' },
];

const APP_VERSION = '0.1.0';

export function StatusBar(): React.ReactElement {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [health, setHealth] = useState<EngineHealth>({ llama: false, audio: false, ffmpeg: false, ytdlp: false });
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const next = await modelService.engineHealth();
        if (!cancelled) setHealth(next);
      } catch {
        if (!cancelled) setHealth({ llama: false, audio: false, ffmpeg: false, ytdlp: false });
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 8000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const handleToggle = useCallback(() => {
    setPopoverOpen((prev) => !prev);
  }, []);

  // Close on click outside or Escape
  useEffect(() => {
    if (!popoverOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setPopoverOpen(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPopoverOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [popoverOpen]);

  return (
    <footer className={styles.bar}>
      {/* Left: version */}
      <span className={styles.version}>v{APP_VERSION}</span>

      {/* Right: local indicator + popover */}
      <div className={styles.right}>
        <span className={styles.engines}>
          llama.cpp {health.llama ? 'ready' : 'offline'} · audio.cpp {health.audio ? 'ready' : 'offline'}
        </span>
        <button
          ref={triggerRef}
          type="button"
          className={styles.localButton}
          onClick={handleToggle}
          aria-haspopup="dialog"
          aria-expanded={popoverOpen}
          aria-label="Local processing info"
        >
          <span className={styles.dot} aria-hidden="true" />
          <span>Local</span>
        </button>

        {popoverOpen && (
          <div
            ref={popoverRef}
            className={styles.popover}
            role="dialog"
            aria-label="Local processing details"
          >
            <p className={styles.popoverTitle}>Local Processing</p>
            <ul className={styles.popoverList}>
              {PROCESSING_INFO.map((info) => (
                <li key={info.label} className={styles.popoverItem}>
                  <span className={styles.popoverLabel}>{info.label}</span>
                  <span className={styles.popoverValue}>{info.value}</span>
                </li>
              ))}
              <li className={styles.popoverItem}>
                <span className={styles.popoverLabel}>llama.cpp</span>
                <span className={styles.popoverValue}>{health.llama ? 'Ready' : 'Offline'}</span>
              </li>
              <li className={styles.popoverItem}>
                <span className={styles.popoverLabel}>audio.cpp</span>
                <span className={styles.popoverValue}>{health.audio ? 'Ready' : 'Offline'}</span>
              </li>
              <li className={styles.popoverItem}>
                <span className={styles.popoverLabel}>FFmpeg</span>
                <span className={styles.popoverValue}>{health.ffmpeg ? 'Found' : 'Missing'}</span>
              </li>
              <li className={styles.popoverItem}>
                <span className={styles.popoverLabel}>yt-dlp</span>
                <span className={styles.popoverValue}>{health.ytdlp ? 'Found' : 'Missing'}</span>
              </li>
            </ul>
          </div>
        )}
      </div>
    </footer>
  );
}
