import Link from 'next/link';
import type { PipelineRun, PipelineRunStatus } from '@/lib/data/types';
import styles from './RunsList.module.css';

const STATUS_LABEL: Record<PipelineRunStatus, string> = {
  running: 'Running',
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
};

const TRIGGER_LABEL: Record<PipelineRun['triggered_by'], string> = {
  'drive-change': 'Drive change',
  'manual-dispatch': 'Manual dispatch',
  schedule: 'Scheduled',
  'dataset-rerun': 'Dataset rerun',
};

function formatDuration(ms: number | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  return remSec === 0 ? `${m}m` : `${m}m ${remSec}s`;
}

interface TimestampLike {
  _seconds: number;
}

function startedSeconds(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return Math.floor(ts / 1000);
  if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
  if (typeof ts === 'object' && typeof (ts as TimestampLike)._seconds === 'number') {
    return (ts as TimestampLike)._seconds;
  }
  return 0;
}

function relativeTime(secondsAgo: number, now: number): string {
  const ms = now - secondsAgo * 1000;
  if (!Number.isFinite(ms) || ms < 0 || secondsAgo === 0) return '—';
  const minutes = Math.round(ms / 60_000);
  if (minutes < 1) return `${Math.round(ms / 1000)}s ago`;
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export type RunsListEntry = PipelineRun & { id: string };

export interface RunsListProps {
  runs: RunsListEntry[];
  loading?: boolean;
  now?: number;
}

export function RunsList({ runs, loading = false, now = Date.now() }: RunsListProps) {
  if (loading && runs.length === 0) {
    return (
      <p className={styles.empty} data-loading>
        Loading runs…
      </p>
    );
  }
  if (runs.length === 0) {
    return (
      <p className={styles.empty} data-empty-runs>
        No pipeline runs recorded yet.
      </p>
    );
  }
  return (
    <ol className={styles.list} data-runs-list>
      {runs.map((run) => {
        const startedAt = startedSeconds(run.started_at);
        const summary = run.summary ?? {
          datasets_total: 0,
          datasets_published: 0,
          datasets_skipped_nochange: 0,
          datasets_blocked_by_drift: 0,
          datasets_failed: 0,
          discovered_files_new: 0,
          schema_drift_opened: 0,
        };
        return (
          <li
            key={run.id}
            className={styles.row}
            data-run={run.id}
            data-status={run.status}
          >
            <span
              className={`${styles.statusBadge} ${styles[`status_${run.status}`]}`}
              aria-label={`Status: ${STATUS_LABEL[run.status]}`}
            >
              <span className={styles.statusDot} aria-hidden="true" />
              <span>{STATUS_LABEL[run.status]}</span>
            </span>
            <div className={styles.identity}>
              <Link href={`/admin/data/runs/${run.id}`} className={styles.idLink}>
                <code>{run.id}</code>
              </Link>
              <p className={styles.trigger}>
                {TRIGGER_LABEL[run.triggered_by] ?? run.triggered_by}
                {' · '}
                {relativeTime(startedAt, now)}
              </p>
            </div>
            <dl className={styles.stats}>
              <div className={styles.statBlock}>
                <dt>Published</dt>
                <dd>
                  <span className={styles.statNum}>{summary.datasets_published}</span>
                  <span className={styles.statTotal}>/ {summary.datasets_total}</span>
                </dd>
              </div>
              {summary.datasets_failed > 0 && (
                <div className={`${styles.statBlock} ${styles.statBlockError}`}>
                  <dt>Failed</dt>
                  <dd>{summary.datasets_failed}</dd>
                </div>
              )}
              {summary.schema_drift_opened > 0 && (
                <div className={`${styles.statBlock} ${styles.statBlockWarn}`}>
                  <dt>Drift</dt>
                  <dd>{summary.schema_drift_opened}</dd>
                </div>
              )}
              {summary.discovered_files_new > 0 && (
                <div className={styles.statBlock}>
                  <dt>Discovered</dt>
                  <dd>{summary.discovered_files_new}</dd>
                </div>
              )}
            </dl>
            <span className={styles.duration} data-duration>
              {formatDuration(run.duration_ms)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
