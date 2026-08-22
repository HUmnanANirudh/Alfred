import { create } from 'zustand';
import type { Toast } from '../types';
import { generateId } from '../utils/id';

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, 'id'> & { id?: string }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = toast.id ?? generateId('tst');
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    const duration = toast.type === 'error' ? toast.duration : (toast.duration ?? 4000);
    if (duration && duration > 0) {
      window.setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (message: string, detail?: string) =>
    useToastStore.getState().push({ type: 'success', message, detail }),
  error: (message: string, detail?: string) =>
    useToastStore.getState().push({ type: 'error', message, detail, duration: 0 }),
  info: (message: string, detail?: string) =>
    useToastStore.getState().push({ type: 'info', message, detail }),
  warning: (message: string, detail?: string) =>
    useToastStore.getState().push({ type: 'warning', message, detail }),
};
