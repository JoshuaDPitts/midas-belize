'use client';
import { use, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useCatalogEntry } from '@/lib/data';
import type { DatasetVersion } from '@/lib/data/types';
import { ProvenanceCard } from '../../components/ProvenanceCard';
import { VersionHistoryTimeline } from '../../components/VersionHistoryTimeline';
import { DiffViewer } from '../../components/DiffViewer';
import { RerunButton } from '../../components/RerunButton';
import { Toast } from '../../components/Toast';
import { useRunPolling } from '../../hooks/useRunPolling';
import shell from '../../_shared/PageShell.module.css';
import styles from './page.module.css';

interface DatasetDetailPageProps {
  params: Promise<{ id: string }>;
}

interface TimestampLike {
  _seconds: number;
}

function timestampSeconds(ts: unknown): number {
  if (ts == null) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return Math.floor(ts.getTime() / 1000);
  if (typeof ts === 'object' && typeof (ts as TimestampLike)._seconds === 'number') {
    return (ts as TimestampLike)._seconds;
  }
  return 0;
}

function findCurrentAndPrevious(
  versions: DatasetVersion[],
): { current: DatasetVersion | null; previous: DatasetVersion | null } {
  const current = versions.find((v) => v.is_current) ?? null;
  const previous =
    [...versions]
      .filter((v) => !v.is_current)
      .sort((a, b) => timestampSeconds(b.published_at) - timestampSeconds(a.published_at))[0] ?? null;
  return { current, previous };
}

export default function DatasetDetailPage({ params }: DatasetDetailPageProps) {
  const { id } = use(params);
  const { entry, versions, loading, error } = useCatalogEntry(id);
  const [triggeredRunId, setTriggeredRunId] = useState<string | null>(null);
  const [toastDismissed, setToastDismissed] = useState(false);
  const { status: pollStatus, run: polledRun } = useRunPolling(triggeredRunId);

  useEffect(() => {
    // Reset the toast-dismissed flag whenever the user kicks off a new rerun.
    if (triggeredRunId) setToastDismissed(false);
  }, [triggeredRunId]);

  const { current, previous } = useMemo(() => findCurrentAndPrevious(versions), [versions]);

  if (loading) {
    return (
      <section className={shell.page} data-page="dataset-detail" data-loading>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Catalog</p>
          <h2 className={shell.heading}>Loading dataset…</h2>
          <p className={shell.identifier}>{id}</p>
        </header>
      </section>
    );
  }

  if (error || !entry) {
    return (
      <section className={shell.page} data-page="dataset-detail" data-error>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Catalog</p>
          <h2 className={shell.heading}>Dataset not available</h2>
          <p className={shell.identifier}>{id}</p>
          <p className={styles.errorText}>{error?.message ?? 'No catalog entry found.'}</p>
          <p>
            <Link href="/admin/data" className={styles.backLink}>
              ← Back to all datasets
            </Link>
          </p>
        </header>
      </section>
    );
  }

  const tags = entry.tags ?? [];
  const visibleAt = entry.visible_at ?? [];

  return (
    <section className={shell.page} data-page="dataset-detail" data-dataset-id={entry.id}>
      <header className={styles.header}>
        <Link href="/admin/data" className={styles.backLink}>
          ← All datasets
        </Link>
        <p className={shell.eyebrow}>Catalog</p>
        <h2 className={shell.heading}>{entry.title || entry.id}</h2>
        <p className={shell.identifier}>{entry.id}</p>
        <div className={styles.metaRow}>
          <span
            className={`${styles.statusPill} ${styles[`status_${entry.status.replaceAll('-', '_')}`] ?? ''}`}
            data-status={entry.status}
          >
            {entry.status}
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Scope</span>
            <span className={styles.metaValue}>{entry.scope}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Visible at</span>
            <span className={styles.metaValue}>
              {visibleAt.length === 0 ? '—' : visibleAt.join(', ')}
            </span>
          </span>
          {tags.length > 0 && (
            <span className={styles.tags} data-tags>
              {tags.map((t) => (
                <code key={t} className={styles.tag}>
                  {t}
                </code>
              ))}
            </span>
          )}
        </div>
        <div className={styles.actions}>
          <RerunButton datasetId={entry.id} onStarted={setTriggeredRunId} />
          {triggeredRunId && (
            <p className={styles.rerunNotice} data-rerun-notice>
              Triggered run{' '}
              <Link
                href={`/admin/data/runs/${triggeredRunId}`}
                className={styles.runLink}
              >
                <code>{triggeredRunId}</code>
              </Link>
              .
            </p>
          )}
        </div>
      </header>

      <div className={styles.split}>
        <ProvenanceCard provenance={entry.provenance} />
        {current && previous ? (
          <DiffViewer from={previous} to={current} />
        ) : (
          <article className={styles.diffPlaceholder} data-diff-empty>
            <p className={shell.eyebrow}>Diff</p>
            <p className={styles.diffPlaceholderText}>
              {versions.length <= 1
                ? 'No previous version yet — diff appears once this dataset has shipped a second version.'
                : 'No current version flagged.'}
            </p>
          </article>
        )}
      </div>

      <section className={styles.versionsSection}>
        <header className={styles.versionsHeader}>
          <p className={shell.eyebrow}>Version history</p>
          <p className={styles.versionsCount}>
            {versions.length} version{versions.length === 1 ? '' : 's'}
          </p>
        </header>
        <VersionHistoryTimeline versions={versions} />
      </section>
      {triggeredRunId && !toastDismissed && (
        <RunStatusToast
          runId={triggeredRunId}
          datasetId={entry.id}
          status={pollStatus}
          run={polledRun}
          onDismiss={() => setToastDismissed(true)}
        />
      )}
    </section>
  );
}

interface RunStatusToastProps {
  runId: string;
  datasetId: string;
  status: ReturnType<typeof useRunPolling>['status'];
  run: ReturnType<typeof useRunPolling>['run'];
  onDismiss: () => void;
}

function RunStatusToast({
  runId,
  datasetId,
  status,
  run,
  onDismiss,
}: RunStatusToastProps) {
  if (status === 'idle' || status === 'running' || status === 'partial') {
    if (status !== 'partial') return null;
  }

  const detailHref = `/admin/data/runs/${runId}`;

  if (status === 'success') {
    const outcome = run?.dataset_outcomes?.find((o) => o.dataset_id === datasetId);
    const versionAfter = outcome?.version_after;
    return (
      <Toast
        variant="success"
        message={
          versionAfter
            ? `Rerun completed — new version ${versionAfter}`
            : 'Rerun completed.'
        }
        action={{ label: 'View run', href: detailHref }}
        onDismiss={onDismiss}
      />
    );
  }

  if (status === 'partial') {
    const failed = run?.summary?.datasets_failed ?? 0;
    return (
      <Toast
        variant="info"
        message={`Rerun finished with partial success${
          failed > 0 ? ` — ${failed} dataset${failed === 1 ? '' : 's'} failed.` : '.'
        }`}
        action={{ label: 'View run', href: detailHref }}
        onDismiss={onDismiss}
      />
    );
  }

  if (status === 'failed') {
    return (
      <Toast
        variant="error"
        message={`Rerun failed. ${run?.error_summary ?? 'See run detail for diagnostics.'}`}
        action={{ label: 'View run', href: detailHref }}
        onDismiss={onDismiss}
      />
    );
  }

  if (status === 'timed-out') {
    return (
      <Toast
        variant="info"
        message="Still running after 10 minutes — pipeline may need attention."
        action={{ label: 'View run', href: detailHref }}
        onDismiss={onDismiss}
      />
    );
  }

  return null;
}
