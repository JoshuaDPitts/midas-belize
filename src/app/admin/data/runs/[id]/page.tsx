'use client';
import { use } from 'react';
import Link from 'next/link';
import type { PipelineRun, PipelineRunStatus } from '@/lib/data/types';
import { useRun } from '../../hooks/useRun';
import { DatasetOutcomesTable } from '../../components/DatasetOutcomesTable';
import shell from '../../_shared/PageShell.module.css';
import styles from './page.module.css';

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

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

function tsDate(ts: unknown): Date | null {
  if (ts == null) return null;
  if (ts instanceof Date) return ts;
  if (typeof ts === 'number') return new Date(ts);
  if (typeof ts === 'object' && typeof (ts as TimestampLike)._seconds === 'number') {
    return new Date((ts as TimestampLike)._seconds * 1000);
  }
  return null;
}

export default function RunDetailPage({ params }: RunDetailPageProps) {
  const { id } = use(params);
  const { run, loading, error } = useRun(id, { pollMs: 5_000 });

  if (loading) {
    return (
      <section className={shell.page} data-page="run-detail" data-loading>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Pipeline run</p>
          <h2 className={shell.heading}>Loading run…</h2>
          <p className={shell.identifier}>{id}</p>
        </header>
      </section>
    );
  }

  if (error || !run) {
    return (
      <section className={shell.page} data-page="run-detail" data-error>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Pipeline run</p>
          <h2 className={shell.heading}>Run not available</h2>
          <p className={shell.identifier}>{id}</p>
          <p className={styles.errorBanner}>{error?.message ?? 'No run found.'}</p>
          <p>
            <Link href="/admin/data/runs" className={styles.backLink}>
              ← Back to all runs
            </Link>
          </p>
        </header>
      </section>
    );
  }

  const startedAt = tsDate(run.started_at);
  const endedAt = tsDate(run.ended_at);
  const summary = run.summary;
  const statusKey = run.status;

  return (
    <section className={shell.page} data-page="run-detail" data-run-id={run.id}>
      <header className={styles.header}>
        <Link href="/admin/data/runs" className={styles.backLink}>
          ← All runs
        </Link>
        <p className={shell.eyebrow}>Pipeline run</p>
        <h2 className={shell.heading}>Run {run.id}</h2>
        <div className={styles.metaRow}>
          <span
            className={`${styles.statusPill} ${styles[`status_${statusKey}`]}`}
            data-status={run.status}
          >
            <span className={styles.statusDot} aria-hidden="true" />
            {STATUS_LABEL[run.status]}
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Trigger</span>
            <span className={styles.metaValue}>
              {TRIGGER_LABEL[run.triggered_by] ?? run.triggered_by}
            </span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Duration</span>
            <span className={styles.metaValue}>{formatDuration(run.duration_ms)}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Started</span>
            <span className={styles.metaValue} title={startedAt?.toISOString() ?? ''}>
              {startedAt ? startedAt.toLocaleString() : '—'}
            </span>
          </span>
          {endedAt && (
            <span className={styles.metaItem}>
              <span className={styles.metaLabel}>Ended</span>
              <span className={styles.metaValue} title={endedAt.toISOString()}>
                {endedAt.toLocaleString()}
              </span>
            </span>
          )}
        </div>
        {run.github_run_url && (
          <p className={styles.actions}>
            <a
              href={run.github_run_url}
              target="_blank"
              rel="noreferrer noopener"
              className={styles.ghLink}
            >
              View GitHub Actions log <span aria-hidden="true">↗</span>
            </a>
          </p>
        )}
      </header>

      {run.error_summary && (
        <p className={styles.errorBanner} role="alert" data-error-summary>
          <strong>Run-level error:</strong> {run.error_summary}
        </p>
      )}

      <div className={styles.kpiRow} data-kpi-row>
        <article className={`${styles.kpi} ${summary.datasets_published > 0 ? styles.kpiSuccess : ''}`}>
          <p className={styles.kpiLabel}>Published</p>
          <p className={styles.kpiValue}>
            {summary.datasets_published}
            <span className={styles.kpiUnit}>/ {summary.datasets_total}</span>
          </p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>No change</p>
          <p className={styles.kpiValue}>{summary.datasets_skipped_nochange}</p>
        </article>
        <article className={`${styles.kpi} ${summary.datasets_blocked_by_drift > 0 ? styles.kpiError : ''}`}>
          <p className={styles.kpiLabel}>Blocked</p>
          <p className={styles.kpiValue}>{summary.datasets_blocked_by_drift}</p>
        </article>
        <article className={`${styles.kpi} ${summary.datasets_failed > 0 ? styles.kpiError : ''}`}>
          <p className={styles.kpiLabel}>Failed</p>
          <p className={styles.kpiValue}>{summary.datasets_failed}</p>
        </article>
        <article className={`${styles.kpi} ${summary.schema_drift_opened > 0 ? styles.kpiWarn : ''}`}>
          <p className={styles.kpiLabel}>New drift</p>
          <p className={styles.kpiValue}>{summary.schema_drift_opened}</p>
        </article>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>Discovered</p>
          <p className={styles.kpiValue}>{summary.discovered_files_new}</p>
        </article>
      </div>

      <section className={styles.outcomesSection}>
        <header className={styles.sectionHeader}>
          <p className={shell.eyebrow}>Dataset outcomes</p>
          <p className={styles.outcomeCount}>
            {run.dataset_outcomes.length} outcome
            {run.dataset_outcomes.length === 1 ? '' : 's'}
          </p>
        </header>
        <DatasetOutcomesTable outcomes={run.dataset_outcomes} />
      </section>
    </section>
  );
}
