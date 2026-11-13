'use client';
import { useMemo, useState } from 'react';
import { usePipelineStatus } from '@/lib/data';
import type { PipelineRun, PipelineRunStatus } from '@/lib/data/types';
import { RunsList, type RunsListEntry } from '../components/RunsList';
import { DurationTrendChart } from '../components/DurationTrendChart';
import { SuccessRateChart } from '../components/SuccessRateChart';
import shell from '../_shared/PageShell.module.css';
import styles from './page.module.css';

const STATUS_FILTERS: Array<PipelineRunStatus | 'all'> = [
  'all',
  'success',
  'partial',
  'failed',
  'running',
];

const STATUS_FILTER_LABEL: Record<PipelineRunStatus | 'all', string> = {
  all: 'All runs',
  success: 'Success',
  partial: 'Partial',
  failed: 'Failed',
  running: 'Running',
};

interface RunStats {
  total: number;
  success: number;
  failed: number;
  partial: number;
  running: number;
  successRate: number;
}

function computeStats(runs: RunsListEntry[]): RunStats {
  const total = runs.length;
  let success = 0;
  let failed = 0;
  let partial = 0;
  let running = 0;
  for (const r of runs) {
    if (r.status === 'success') success += 1;
    else if (r.status === 'failed') failed += 1;
    else if (r.status === 'partial') partial += 1;
    else if (r.status === 'running') running += 1;
  }
  const settled = success + failed + partial;
  const successRate = settled === 0 ? 0 : Math.round((success / settled) * 100);
  return { total, success, failed, partial, running, successRate };
}

export default function RunsPage() {
  const { runs, loading, error } = usePipelineStatus({ pollMs: 10_000 });
  const [statusFilter, setStatusFilter] = useState<PipelineRunStatus | 'all'>('all');
  const typed = runs as Array<PipelineRun & { id: string }>;

  const stats = useMemo(() => computeStats(typed), [typed]);
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return typed;
    return typed.filter((r) => r.status === statusFilter);
  }, [typed, statusFilter]);

  const subhead = error
    ? `Error: ${error.message}`
    : loading
      ? 'Loading runs…'
      : `${stats.total} run${stats.total === 1 ? '' : 's'} in the last window`;

  return (
    <section className={shell.page} data-page="runs">
      <header className={shell.header}>
        <p className={shell.eyebrow}>Pipeline</p>
        <h2 className={shell.heading}>Pipeline runs</h2>
        <p className={shell.identifier} data-loading={loading || undefined}>
          {subhead}
        </p>
      </header>

      <div className={styles.kpiRow} data-kpi-row>
        <article className={styles.kpi}>
          <p className={styles.kpiLabel}>Total runs</p>
          <p className={styles.kpiValue}>{stats.total}</p>
        </article>
        <article className={`${styles.kpi} ${styles.kpiSuccess}`}>
          <p className={styles.kpiLabel}>Success rate</p>
          <p className={styles.kpiValue}>
            {stats.successRate}
            <span className={styles.kpiUnit}>%</span>
          </p>
          <p className={styles.kpiFootnote}>
            {stats.success} ok · {stats.partial} partial · {stats.failed} failed
          </p>
        </article>
        <article className={`${styles.kpi} ${stats.failed > 0 ? styles.kpiError : ''}`}>
          <p className={styles.kpiLabel}>Failed</p>
          <p className={styles.kpiValue}>{stats.failed}</p>
        </article>
        <article className={`${styles.kpi} ${stats.running > 0 ? styles.kpiRunning : ''}`}>
          <p className={styles.kpiLabel}>Running</p>
          <p className={styles.kpiValue}>{stats.running}</p>
        </article>
      </div>

      <div className={styles.chartGrid}>
        <section className={styles.trendSection}>
          <header className={styles.sectionHeader}>
            <p className={shell.eyebrow}>Duration trend</p>
          </header>
          <DurationTrendChart runs={typed} />
        </section>
        <section className={styles.trendSection}>
          <header className={styles.sectionHeader}>
            <p className={shell.eyebrow}>7-day success rate</p>
          </header>
          <SuccessRateChart runs={typed} />
        </section>
      </div>

      <section className={styles.runsSection}>
        <header className={styles.sectionHeader}>
          <p className={shell.eyebrow}>Recent runs</p>
          <label className={styles.filterWrap}>
            <span className={styles.filterLabel}>Status</span>
            <select
              className={styles.filter}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as PipelineRunStatus | 'all')}
              aria-label="Filter runs by status"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_FILTER_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          <p className={styles.resultCount} data-result-count>
            {filtered.length} of {stats.total}
          </p>
        </header>
        <RunsList runs={filtered} loading={loading} />
      </section>
    </section>
  );
}
