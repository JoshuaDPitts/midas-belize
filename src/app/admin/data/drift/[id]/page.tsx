'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useDriftTicket } from '../../hooks/useDriftTicket';
import { SchemaEditor } from '../../components/SchemaEditor';
import { SampleRowsPreview } from '../../components/SampleRowsPreview';
import { RateLimitAlert } from '../../components/RateLimitAlert';
import shell from '../../_shared/PageShell.module.css';
import styles from './page.module.css';

interface DriftDetailPageProps {
  params: Promise<{ id: string }>;
}

interface ResolveResponse {
  ok: boolean;
  status: 'accepted' | 'rejected' | 'deferred';
  pr_commit_sha?: string | null;
}

interface ResolveError {
  error?: { code?: string; message?: string };
}

type Action = 'accept' | 'reject' | 'defer';

const STATUS_LABEL: Record<string, string> = {
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

export default function DriftDetailPage({ params }: DriftDetailPageProps) {
  const { id } = use(params);
  const { ticket, loading, error, mutate } = useDriftTicket(id);

  const [newMap, setNewMap] = useState('');
  const [mapError, setMapError] = useState<string | null>('Snippet is empty.');
  const [notes, setNotes] = useState('');
  const [pendingAction, setPendingAction] = useState<Action | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolveResult, setResolveResult] = useState<ResolveResponse | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  if (loading) {
    return (
      <section className={shell.page} data-page="drift-detail" data-loading>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Drift ticket</p>
          <h2 className={shell.heading}>Loading drift…</h2>
          <p className={shell.identifier}>{id}</p>
        </header>
      </section>
    );
  }

  if (error || !ticket) {
    return (
      <section className={shell.page} data-page="drift-detail" data-error>
        <header className={shell.header}>
          <p className={shell.eyebrow}>Drift ticket</p>
          <h2 className={shell.heading}>Drift ticket not available</h2>
          <p className={shell.identifier}>{id}</p>
          <p className={styles.errorBanner}>{error?.message ?? 'No ticket found.'}</p>
          <p>
            <Link href="/admin/data/drift" className={styles.backLink}>
              ← Back to drift queue
            </Link>
          </p>
        </header>
      </section>
    );
  }

  const isResolved = ticket.status !== 'open';
  const resolvedAt = tsDate(ticket.resolved_at);
  const detectedAt = tsDate(ticket.detected_at);
  const rateLimited = retryAfter !== null;
  const acceptDisabled =
    pendingAction !== null || mapError !== null || isResolved || rateLimited;
  const otherDisabled = pendingAction !== null || isResolved || rateLimited;

  async function resolve(action: Action) {
    if (!ticket || retryAfter !== null) return;
    setPendingAction(action);
    setResolveError(null);
    try {
      const body: Record<string, unknown> = {
        action,
        notes: notes.trim() || undefined,
      };
      if (action === 'accept') body.new_schema_code = newMap;
      const res = await fetch(`/api/ops/drift/${encodeURIComponent(ticket.id)}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        const headerValue = res.headers.get('Retry-After');
        const errBody = (await res.json().catch(() => ({}))) as ResolveError & {
          error?: { details?: { retryAfter?: number } };
        };
        const seconds = Number(
          headerValue ?? errBody.error?.details?.retryAfter ?? 60,
        );
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        return;
      }
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as ResolveError;
        throw new Error(
          payload.error?.message ?? `HTTP ${res.status}`,
        );
      }
      const payload = (await res.json()) as ResolveResponse;
      setResolveResult(payload);
      await mutate();
    } catch (e) {
      setResolveError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section className={shell.page} data-page="drift-detail" data-drift-id={ticket.id}>
      <header className={styles.header}>
        <Link href="/admin/data/drift" className={styles.backLink}>
          ← Drift queue
        </Link>
        <p className={shell.eyebrow}>Drift ticket</p>
        <h2 className={styles.heading}>
          <code>{ticket.schema_id}</code>
          <span className={styles.versionPill}>v{ticket.current_schema_version}</span>
        </h2>
        <p className={shell.identifier}>{ticket.id}</p>
        <div className={styles.metaRow}>
          <span
            className={`${styles.statusPill} ${styles[`status_${ticket.status}`] ?? ''}`}
            data-status={ticket.status}
          >
            {STATUS_LABEL[ticket.status] ?? ticket.status}
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Detected</span>
            <span className={styles.metaValue} title={detectedAt?.toISOString() ?? ''}>
              {detectedAt ? detectedAt.toLocaleString() : '—'}
            </span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Occurrences</span>
            <span className={styles.metaValue}>{ticket.occurrence_count}</span>
          </span>
          <span className={styles.metaItem}>
            <span className={styles.metaLabel}>Source</span>
            <code className={styles.sourcePath}>{ticket.source_file_path}</code>
          </span>
        </div>
      </header>

      {isResolved && (
        <div className={styles.resolvedBanner} data-resolved-banner>
          <p>
            Already <strong>{STATUS_LABEL[ticket.status]?.toLowerCase()}</strong>
            {resolvedAt ? ` at ${resolvedAt.toLocaleString()}` : ''}
            {ticket.resolution_commit_sha
              ? ` — commit ${ticket.resolution_commit_sha.slice(0, 7)}`
              : ''}
            .
          </p>
          {ticket.resolution_notes && (
            <p className={styles.resolvedNotes}>{ticket.resolution_notes}</p>
          )}
        </div>
      )}

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={shell.eyebrow}>Diff</p>
        </header>
        <div className={styles.diffGrid}>
          <DiffBlock
            kind="error"
            label="Missing required"
            items={ticket.diff.missing_required}
          />
          <DiffBlock kind="warn" label="Unknown added" items={ticket.diff.added_unknown} />
          <DiffBlock
            kind="muted"
            label="Dropped dynamic"
            items={ticket.diff.dropped_dynamic}
          />
        </div>
        {ticket.diff.renamed_candidates.length > 0 && (
          <div className={styles.renames} data-renames>
            <p className={shell.eyebrow}>Possible renames</p>
            <ul className={styles.renameList}>
              {ticket.diff.renamed_candidates.map((r) => (
                <li key={`${r.from}-${r.to}`} className={styles.renamePair}>
                  <code className={styles.renameFrom}>{r.from}</code>
                  <span aria-hidden="true">→</span>
                  <code className={styles.renameTo}>{r.to}</code>
                  <span className={styles.confidence}>
                    {Math.round(r.confidence * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={shell.eyebrow}>Sample rows</p>
        </header>
        <SampleRowsPreview rows={ticket.sample_rows ?? []} />
      </section>

      <section className={styles.section}>
        <header className={styles.sectionHeader}>
          <p className={shell.eyebrow}>Resolution</p>
          <p className={styles.affectedCount}>
            Affects {ticket.affected_datasets.length} dataset
            {ticket.affected_datasets.length === 1 ? '' : 's'}
          </p>
        </header>

        <label className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Notes</span>
          <textarea
            className={styles.notesInput}
            placeholder="Why are you accepting / deferring / rejecting this drift?"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isResolved}
            aria-label="Resolution notes"
          />
        </label>

        <div className={styles.fieldGroup}>
          <span className={styles.fieldLabel}>Accept → new <code>map()</code> snippet</span>
          <SchemaEditor
            onChange={(value, err) => {
              setNewMap(value);
              setMapError(err);
            }}
          />
        </div>

        {retryAfter !== null && (
          <RateLimitAlert
            retryAfterSeconds={retryAfter}
            actionLabel="resolving"
            onExpire={() => setRetryAfter(null)}
          />
        )}
        {resolveError && (
          <p className={styles.errorBanner} role="alert" data-resolve-error>
            {resolveError}
          </p>
        )}
        {resolveResult && (
          <p className={styles.successBanner} role="status" data-resolve-success>
            <strong>{STATUS_LABEL[resolveResult.status]}</strong>
            {resolveResult.pr_commit_sha
              ? ` — opened schema-bump PR (commit ${resolveResult.pr_commit_sha.slice(0, 7)}). `
              : '. '}
            Refreshing ticket state…
          </p>
        )}

        <div className={styles.actions} data-resolution-actions>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            onClick={() => resolve('accept')}
            disabled={acceptDisabled}
            data-action="accept"
          >
            {pendingAction === 'accept' ? 'Opening PR…' : 'Accept → open PR'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => resolve('defer')}
            disabled={otherDisabled}
            data-action="defer"
          >
            {pendingAction === 'defer' ? 'Deferring…' : 'Defer'}
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonDanger}`}
            onClick={() => resolve('reject')}
            disabled={otherDisabled}
            data-action="reject"
          >
            {pendingAction === 'reject' ? 'Rejecting…' : 'Reject'}
          </button>
        </div>
      </section>
    </section>
  );
}

interface DiffBlockProps {
  kind: 'error' | 'warn' | 'muted';
  label: string;
  items: string[];
}

function DiffBlock({ kind, label, items }: DiffBlockProps) {
  if (items.length === 0) return null;
  return (
    <article
      className={`${styles.diffCard} ${styles[`diffCard_${kind}`]}`}
      data-diff-block={kind}
    >
      <p className={styles.diffLabel}>{label}</p>
      <div className={styles.diffChips}>
        {items.map((item) => (
          <code key={item} className={`${styles.diffChip} ${styles[`diffChip_${kind}`]}`}>
            {item}
          </code>
        ))}
      </div>
    </article>
  );
}
