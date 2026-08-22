import { cn } from '../../utils/cn';
import styles from './Input.module.css';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className, id, ...props }: TextareaProps) {
  const inputId = id ?? props.name;
  return (
    <label className={styles.wrap} htmlFor={inputId}>
      {label && <span className={styles.label}>{label}</span>}
      <textarea
        id={inputId}
        className={cn(styles.input, styles.area, error && styles.invalid, className)}
        {...props}
      />
      {error && <span className={styles.error}>{error}</span>}
      {!error && hint && <span className={styles.hint}>{hint}</span>}
    </label>
  );
}
