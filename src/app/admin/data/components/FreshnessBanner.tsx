'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useStaleCount } from '../hooks/useStaleCount';
import styles from './FreshnessBanner.module.css';

const DISMISSED_KEY = 'midas-freshness-banner-dismissed';

export function FreshnessBanner() {
  const { stale, old, total, loading } = useStaleCount();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = sessionStorage.getItem(DISMISSED_KEY);
    if (stored) setDismissed(true);
  }, []);

  if (loading || dismissed || stale === 0 || total === 0) {
    return null;
  }

  function dismiss() {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(DISMISSED_KEY, '1');
    }
  }

  const severity = old > 0 ? 'old' : 'stale';
  const breakdown = old > 0 ? ` (${old} > 7d)` : '';

  return (
    <div
      role="status"
      className={`${styles.banner} ${styles[`banner_${severity}`]}`}
      data-freshness-banner
      data-severity={severity}
    >
      <span className={styles.icon} aria-hidden="true">
        {old > 0 ? '⚠' : '⏱'}
      </span>
      <span className={styles.message}>
        <strong data-stale-count>{stale}</strong>
        {` of ${total} dataset${total === 1 ? '' : 's'} `}
        {stale === 1 ? "hasn't" : "haven't"} updated in over 24 hours
        {breakdown}
        {' — '}
        <Link href="/admin/data" className={styles.link}>
          review stale datasets →
        </Link>
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={dismiss}
        aria-label="Dismiss freshness banner"
        data-action="dismiss"
      >
        ×
      </button>
    </div>
  );
}
