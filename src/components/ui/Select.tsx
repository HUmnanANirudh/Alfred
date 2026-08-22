import { cn } from '../../utils/cn';
import styles from './Input.module.css';
import selectStyles from './Select.module.css';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export function Select({ label, error, className, children, id, ...props }: SelectProps) {
  const inputId = id ?? props.name;
  return (
    <label className={styles.wrap} htmlFor={inputId}>
      {label && <span className={styles.label}>{label}</span>}
      <select
        id={inputId}
        className={cn(styles.input, selectStyles.select, error && styles.invalid, className)}
        {...props}
      >
        {children}
      </select>
      {error && <span className={styles.error}>{error}</span>}
    </label>
  );
}
