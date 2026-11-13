'use client';
import { useEffect, useRef, useState } from 'react';
import styles from './Toast.module.css';

export type ToastVariant = 'info' | 'success' | 'error';

export interface ToastProps {
  message: string;
  variant?: ToastVariant;
  /** ms before auto-dismiss; defaults to 6000. Pass 0 to disable. */
  duration?: number;
  /** Optional CTA — typically a link to the relevant detail route. */
  action?: { label: string; href: string };
  onDismiss: () => void;
}

const VARIANT_ICON: Record<ToastVariant, string> = {
  info: 'ℹ',
  success: '✓',
  error: '⚠',
};

export function Toast({
  message,
  variant = 'info',
  duration = 6000,
  action,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismissRef.current();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  function close() {
    setVisible(false);
    onDismissRef.current();
  }

  return (
    <div
      className={`${styles.toast} ${styles[`toast_${variant}`]}`}
      role="status"
      aria-live="polite"
      data-toast
      data-variant={variant}
    >
      <span className={styles.icon} aria-hidden="true">
        {VARIANT_ICON[variant]}
      </span>
      <span className={styles.message}>{message}</span>
      {action && (
        <a className={styles.action} href={action.href} data-toast-action>
          {action.label} →
        </a>
      )}
      <button
        type="button"
        className={styles.close}
        onClick={close}
        aria-label="Dismiss"
      >
        ×
      </button>
      {duration > 0 && (
        <span
          className={styles.progress}
          style={{ animationDuration: `${duration}ms` }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
