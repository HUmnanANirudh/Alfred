import { useState } from 'react';
import type { ClipCandidate } from '../../types';
import { formatDuration } from '../../utils/format';
import { Button } from '../ui/Button';
import styles from './ClipCandidateCard.module.css';

interface Props {
  clip: ClipCandidate;
  onRender: (clip: ClipCandidate) => void;
  rendering: boolean;
  rendered: boolean;
}

export function ClipCandidateCard({ clip, onRender, rendering, rendered }: Props) {
  const [start, setStart] = useState(clip.start);
  const [end, setEnd] = useState(clip.end);
  const [editingTime, setEditingTime] = useState(false);
  const [startInput, setStartInput] = useState(String(clip.start));
  const [endInput, setEndInput] = useState(String(clip.end));

  const dur = end - start;
  const pct = Math.round(clip.hookScore * 100);

  function saveTime() {
    const s = parseFloat(startInput);
    const e = parseFloat(endInput);
    if (!isNaN(s) && !isNaN(e) && e > s) {
      setStart(s);
      setEnd(e);
    }
    setEditingTime(false);
  }

  function cancelTime() {
    setStartInput(String(start));
    setEndInput(String(end));
    setEditingTime(false);
  }

  return (
    <div className={`${styles.card} ${rendered ? styles.rendered : ''}`}>
      {/* Score bar */}
      <div className={styles.scorebar} style={{ width: `${pct}%` }} />

      <div className={styles.header}>
        {editingTime ? (
          <div className={styles.timeEdit}>
            <input
              className={styles.timeInput}
              value={startInput}
              onChange={e => setStartInput(e.target.value)}
              placeholder="start (s)"
              type="number"
              step="0.5"
            />
            <span style={{ color: 'var(--color-text-tertiary)' }}>→</span>
            <input
              className={styles.timeInput}
              value={endInput}
              onChange={e => setEndInput(e.target.value)}
              placeholder="end (s)"
              type="number"
              step="0.5"
            />
            <Button size="sm" variant="primary" onClick={saveTime}>Save</Button>
            <Button size="sm" variant="ghost" onClick={cancelTime}>Cancel</Button>
          </div>
        ) : (
          <button className={styles.timeBtn} onClick={() => setEditingTime(true)}>
            <span className={styles.timestamp}>
              {formatDuration(start)} → {formatDuration(end)}
            </span>
            <span className={styles.dur}>{dur.toFixed(1)}s</span>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>Edit</span>
          </button>
        )}

        <span className={styles.score}>{pct}%</span>
      </div>

      <p className={styles.hook}>{clip.hook}</p>
      <p className={styles.reason}>{clip.reason}</p>

      <div className={styles.footer}>
        <Button
          variant={rendered ? 'secondary' : 'primary'}
          loading={rendering}
          disabled={rendering || rendered}
          onClick={() => onRender({ ...clip, start, end })}
        >
          {rendered ? 'Rendered ✓' : rendering ? 'Rendering…' : 'Render Clip'}
        </Button>
      </div>
    </div>
  );
}
