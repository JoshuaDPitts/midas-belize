import styles from './FreshnessIndicator.module.css';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

type Bucket = 'fresh' | 'stale' | 'old' | 'unknown';

function bucketFor(ageMs: number): Bucket {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown';
  if (ageMs < DAY_MS) return 'fresh';
  if (ageMs < 7 * DAY_MS) return 'stale';
  return 'old';
}

function formatRelative(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return '—';
  const minutes = Math.round(ageMs / 60_000);
  if (minutes < 1) return `${Math.round(ageMs / 1000)}s`;
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(ageMs / DAY_MS)}d`;
}

export interface FreshnessIndicatorProps {
  updatedAt: Date | number | null;
  now?: number;
}

export function FreshnessIndicator({ updatedAt, now = Date.now() }: FreshnessIndicatorProps) {
  const updatedMs =
    updatedAt instanceof Date
      ? updatedAt.getTime()
      : typeof updatedAt === 'number'
        ? updatedAt
        : null;
  const ageMs = updatedMs == null ? Infinity : now - updatedMs;
  const bucket = bucketFor(ageMs);
  const label = bucket === 'unknown' ? '—' : `${formatRelative(ageMs)} ago`;
  return (
    <span
      className={`${styles.indicator} ${styles[bucket]}`}
      title={updatedMs == null ? 'No timestamp' : `Updated ${formatRelative(ageMs)} ago`}
      data-bucket={bucket}
    >
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </span>
  );
}
