'use client';
import { useEffect, useState } from 'react';
import styles from './RateLimitAlert.module.css';

export interface RateLimitAlertProps {
  /** Seconds to wait before retrying — typically the value of the `Retry-After` header. */
  retryAfterSeconds: number;
  /** Optional callback fired when the live countdown reaches zero. */
  onExpire?: () => void;
  /** Override the action label embedded in the message ("retrying", "running again", etc.) */
  actionLabel?: string;
}

export function formatWait(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0s';
  const total = Math.ceil(seconds);
  const minutes = Math.floor(total / 60);
  const secs = total % 60;
  if (minutes === 0) return `${secs}s`;
  if (secs === 0) return `${minutes}m`;
  return `${minutes}m ${secs}s`;
}

export function RateLimitAlert({
  retryAfterSeconds,
  onExpire,
  actionLabel = 'retrying',
}: RateLimitAlertProps) {
  const initial = Math.max(0, Math.ceil(retryAfterSeconds));
  const [remaining, setRemaining] = useState(initial);

  // Reset the countdown if a fresh retryAfterSeconds is pushed in.
  useEffect(() => {
    setRemaining(Math.max(0, Math.ceil(retryAfterSeconds)));
  }, [retryAfterSeconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const interval = setInterval(() => {
      // The setter is the single source of truth for the countdown; onExpire
      // fires from the effect's `remaining <= 0` branch on the next render so
      // it can't double-fire under strict-mode double-invocation.
      setRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const expired = remaining <= 0;

  return (
    <div
      role="alert"
      className={`${styles.alert} ${expired ? styles.alertExpired : ''}`}
      data-rate-limit-alert
      data-expired={expired || undefined}
    >
      <span className={styles.icon} aria-hidden="true">
        {expired ? '✓' : '⏱'}
      </span>
      <span className={styles.message}>
        {expired ? (
          <>You can try {actionLabel.replace(/ing$/, '')} again now.</>
        ) : (
          <>
            <strong>Rate limit reached.</strong> Wait{' '}
            <span className={styles.timer} data-rate-limit-remaining={remaining}>
              {formatWait(remaining)}
            </span>{' '}
            before {actionLabel}.
          </>
        )}
      </span>
    </div>
  );
}
