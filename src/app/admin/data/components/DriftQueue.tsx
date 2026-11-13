import Link from 'next/link';
import type { SchemaDrift } from '@/lib/data/types';
import styles from './DriftQueue.module.css';

const STATUS_LABEL: Record<SchemaDrift['status'], string> = {
  open: 'Open',
  accepted: 'Accepted',
  rejected: 'Rejected',
  deferred: 'Deferred',
  superseded: 'Superseded',
};

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

export type DriftTicket = SchemaDrift & { id: string };

export interface DriftQueueProps {
  tickets: DriftTicket[];
  loading?: boolean;
  now?: number;
}

export function DriftQueue({ tickets, loading = false, now = Date.now() }: DriftQueueProps) {
  if (loading && tickets.length === 0) {
    return (
      <p className={styles.empty} data-loading>
        Loading drift tickets…
      </p>
    );
  }
  if (tickets.length === 0) {
    return (
      <p className={styles.empty} data-empty-drift>
        No drift tickets in this state.
      </p>
    );
  }
  return (
    <ul className={styles.list} data-drift-list>
      {tickets.map((t) => {
        const detectedAt = tsDate(t.detected_at);
        const missing = t.diff.missing_required;
        const added = t.diff.added_unknown;
        const renames = t.diff.renamed_candidates;
        const dropped = t.diff.dropped_dynamic ?? [];
        return (
          <li
            key={t.id}
            className={`${styles.card} ${styles[`card_${t.status}`] ?? ''}`}
            data-drift={t.id}
            data-status={t.status}
          >
            <header className={styles.header}>
              <div className={styles.identity}>
                <p className={styles.schemaEyebrow}>Schema</p>
                <p className={styles.schemaId}>
                  <code>{t.schema_id}</code>
                  <span className={styles.versionPill}>v{t.current_schema_version}</span>
                </p>
              </div>
              <div className={styles.headerMeta}>
                <span
                  className={`${styles.statusPill} ${styles[`status_${t.status}`] ?? ''}`}
                  data-status={t.status}
                >
                  {STATUS_LABEL[t.status]}
                </span>
                <span className={styles.occurrence} data-occurrence>
                  Seen {t.occurrence_count}×
                </span>
              </div>
            </header>

            <div className={styles.subHeader}>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Detected</span>
                <span
                  className={styles.metaValue}
                  title={detectedAt?.toISOString() ?? ''}
                >
                  {relativeTime(detectedAt, now)}
                </span>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>First in run</span>
                <Link
                  href={`/admin/data/runs/${t.first_seen_in_run}`}
                  className={styles.runLink}
                >
                  <code>{t.first_seen_in_run}</code>
                </Link>
              </span>
              <span className={styles.metaItem}>
                <span className={styles.metaLabel}>Source</span>
                <code className={styles.sourcePath}>{t.source_file_path}</code>
              </span>
            </div>

            <div className={styles.diff}>
              {missing.length > 0 && (
                <div className={`${styles.diffSection} ${styles.diffSectionError}`} data-diff-missing>
                  <p className={styles.diffLabel}>Missing required</p>
                  <div className={styles.chips}>
                    {missing.map((col) => (
                      <code key={col} className={`${styles.chip} ${styles.chipError}`}>
                        {col}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {added.length > 0 && (
                <div className={`${styles.diffSection} ${styles.diffSectionWarn}`} data-diff-added>
                  <p className={styles.diffLabel}>Unknown added</p>
                  <div className={styles.chips}>
                    {added.map((col) => (
                      <code key={col} className={`${styles.chip} ${styles.chipWarn}`}>
                        {col}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {renames.length > 0 && (
                <div className={styles.diffSection} data-diff-renames>
                  <p className={styles.diffLabel}>Possible renames</p>
                  <div className={styles.chips}>
                    {renames.map((r) => (
                      <span key={`${r.from}-${r.to}`} className={styles.renamePair}>
                        <code className={`${styles.chip} ${styles.chipMuted}`}>{r.from}</code>
                        <span className={styles.renameArrow} aria-hidden="true">→</span>
                        <code className={`${styles.chip} ${styles.chipAccent}`}>{r.to}</code>
                        <span className={styles.confidence}>
                          {Math.round(r.confidence * 100)}%
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {dropped.length > 0 && (
                <div className={styles.diffSection} data-diff-dropped>
                  <p className={styles.diffLabel}>Dropped dynamic</p>
                  <div className={styles.chips}>
                    {dropped.map((col) => (
                      <code key={col} className={`${styles.chip} ${styles.chipMuted}`}>
                        {col}
                      </code>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <footer className={styles.footer}>
              <p className={styles.affectedCount}>
                Affects {t.affected_datasets.length} dataset
                {t.affected_datasets.length === 1 ? '' : 's'}
              </p>
              <Link href={`/admin/data/drift/${t.id}`} className={styles.reviewLink}>
                Review <span aria-hidden="true">→</span>
              </Link>
            </footer>
          </li>
        );
      })}
    </ul>
  );
}
