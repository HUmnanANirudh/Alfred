import type { Job } from '../../types';
import { cn } from '../../utils/cn';
import styles from './ProcessingPanel.module.css';

export function ProcessingPanel({ job, title }: { job: Job; title: string }) {
  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      <ol className={styles.list}>
        {job.steps.map((step) => (
          <li key={step.id} className={styles.row}>
            <span className={styles.label}>{step.label}</span>
            <span className={cn(styles.mark, styles[step.status])} aria-label={step.status}>
              {step.status === 'done' && '✓'}
              {step.status === 'running' && '●'}
              {step.status === 'pending' && '○'}
              {step.status === 'error' && '✕'}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
