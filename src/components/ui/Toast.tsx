import { X } from 'lucide-react';
import { useToastStore } from '../../store/toastStore';
import { cn } from '../../utils/cn';
import styles from './Toast.module.css';

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div className={styles.stack} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={cn(styles.toast, styles[toast.type])}>
          <div>
            <p className={styles.message}>{toast.message}</p>
            {toast.detail && <p className={styles.detail}>{toast.detail}</p>}
          </div>
          <button type="button" className={styles.close} onClick={() => dismiss(toast.id)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
