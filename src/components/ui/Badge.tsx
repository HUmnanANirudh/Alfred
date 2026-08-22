import { cn } from '../../utils/cn';
import type { BadgeVariant } from '../../types';
import styles from './Badge.module.css';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return <span className={cn(styles.badge, styles[variant])}>{children}</span>;
}
