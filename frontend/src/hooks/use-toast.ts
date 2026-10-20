// Simple toast hook for displaying notifications
import { useState, useCallback } from 'react';

type ToastProps = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
  duration?: number;
};

type Toast = ToastProps & {
  id: string;
};

let toastIdCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((props: ToastProps) => {
    const id = `toast-${toastIdCounter++}`;
    const duration = props.duration ?? 3000;

    const newToast: Toast = {
      ...props,
      id,
    };

    setToasts((prev) => [...prev, newToast]);

    // Show alert for now (simple implementation)
    if (props.variant === 'destructive') {
      alert(`Error: ${props.title || props.description || 'An error occurred'}`);
    } else {
      alert(props.title || props.description || 'Success');
    }

    // Auto-remove toast after duration
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, []);

  const dismiss = useCallback((toastId: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== toastId));
  }, []);

  return {
    toast,
    toasts,
    dismiss,
  };
}
