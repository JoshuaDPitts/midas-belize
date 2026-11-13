'use client';
import { useState } from 'react';
import Link from 'next/link';
import type { DatasetOutcome, DatasetOutcomeStatus } from '@/lib/data/types';
import styles from './DatasetOutcomesTable.module.css';

const STATUS_LABEL: Record<DatasetOutcomeStatus, string> = {
  published: 'Published',
  'skipped-nochange': 'No change',
  'blocked-drift': 'Drift blocked',
  'blocked-provenance': 'Provenance blocked',
  failed: 'Failed',
};

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 100) / 10;
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = Math.round(s - m * 60);
  return remSec === 0 ? `${m}m` : `${m}m ${remSec}s`;
}

export interface DatasetOutcomesTableProps {
  outcomes: DatasetOutcome[];
}

export function DatasetOutcomesTable({ outcomes }: DatasetOutcomesTableProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (outcomes.length === 0) {
    return (
      <p className={styles.empty} data-empty-outcomes>
        No dataset outcomes recorded for this run.
      </p>
    );
  }

  function toggle(id: string) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  return (
    <div className={styles.tableWrap} data-outcomes-table>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col" className={styles.th}>Dataset</th>
            <th scope="col" className={styles.th}>Status</th>
            <th scope="col" className={styles.th}>Before → After</th>
            <th scope="col" className={`${styles.th} ${styles.thRight}`}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {outcomes.map((o) => {
            const statusKey = o.status.replaceAll('-', '_');
            const isFailed = o.status === 'failed' || o.status === 'blocked-drift';
            const hasReason = Boolean(o.reason);
            const isExpanded = !!expanded[o.dataset_id];
            const canExpand = isFailed && hasReason;
            return (
              <tr
                key={o.dataset_id}
                className={styles.row}
                data-outcome={o.dataset_id}
                data-status={o.status}
              >
                <td className={styles.idCell}>
                  <Link
                    href={`/admin/data/dataset/${o.dataset_id}`}
                    className={styles.idLink}
                  >
                    {o.dataset_id}
                  </Link>
                  {canExpand && (
                    <button
                      type="button"
                      className={styles.expandBtn}
                      aria-expanded={isExpanded}
                      onClick={() => toggle(o.dataset_id)}
                    >
                      {isExpanded ? 'Hide reason' : 'Show reason'}
                    </button>
                  )}
                  {canExpand && isExpanded && (
                    <pre className={styles.reason} data-reason>
                      {o.reason}
                    </pre>
                  )}
                  {hasReason && !canExpand && (
                    <p className={styles.reasonInline} data-reason>
                      {o.reason}
                    </p>
                  )}
                </td>
                <td>
                  <span
                    className={`${styles.statusPill} ${styles[`status_${statusKey}`] ?? ''}`}
                  >
                    <span className={styles.statusDot} aria-hidden="true" />
                    {STATUS_LABEL[o.status]}
                  </span>
                </td>
                <td className={styles.versionCell}>
                  <code className={styles.versionFrag}>{o.version_before ?? '—'}</code>
                  <span className={styles.arrow} aria-hidden="true">→</span>
                  <code className={styles.versionFrag}>{o.version_after ?? '—'}</code>
                </td>
                <td className={`${styles.durationCell}`}>
                  {formatDuration(o.duration_ms)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
