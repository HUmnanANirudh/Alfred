import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        <span className={styles.engines}>llama.cpp ready · audio.cpp ready</span>
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
            </ul>
          </div>
        )}
      </div>
    </footer>
  );
}
