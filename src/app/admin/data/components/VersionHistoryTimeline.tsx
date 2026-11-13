import type { DatasetVersion } from '@/lib/data/types';
import styles from './VersionHistoryTimeline.module.css';

const KB = 1024;
const MB = KB * 1024;

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
}

interface TimestampLike {
  _seconds: number;
  toDate?: () => Date;
}

function toDate(ts: unknown): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'object') {
    const candidate = ts as TimestampLike;
    if (typeof candidate.toDate === 'function') return candidate.toDate();
    if (typeof candidate._seconds === 'number') return new Date(candidate._seconds * 1000);
  }
  return null;
}

function relativeTime(date: Date | null, now: number): string {
  if (date == null) return '—';
  const ms = now - date.getTime();
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export interface VersionHistoryTimelineProps {
  versions: DatasetVersion[];
  now?: number;
}

export function VersionHistoryTimeline({
  versions,
  now = Date.now(),
}: VersionHistoryTimelineProps) {
  if (versions.length === 0) {
    return (
      <p className={styles.empty} data-empty-versions>
        No versions published yet.
      </p>
    );
  }

  return (
    <ol className={styles.list} data-version-list>
      {versions.map((v) => {
        const published = toDate(v.published_at);
        const isCurrent = v.is_current === true;
        return (
          <li
            key={v.version}
            className={`${styles.row} ${isCurrent ? styles.rowCurrent : ''}`}
            data-version={v.version}
            data-current={isCurrent || undefined}
          >
            <span className={styles.marker} aria-hidden="true">
              {isCurrent ? '★' : '·'}
            </span>
            <div className={styles.identity}>
              <code className={styles.version}>{v.version}</code>
              {isCurrent && <span className={styles.currentBadge}>current</span>}
            </div>
            <dl className={styles.meta}>
              <div>
                <dt>Features</dt>
                <dd>{v.feature_count ?? '—'}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{formatBytes(v.size_bytes)}</dd>
              </div>
              <div>
                <dt>Published</dt>
                <dd title={published?.toISOString() ?? 'unknown'}>
                  {relativeTime(published, now)}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ol>
  );
}
