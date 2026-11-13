'use client';
import { useState } from 'react';
import type { DiscoveredFile } from '@/lib/data/types';
import { RateLimitAlert } from './RateLimitAlert';
import styles from './DiscoveredFilesList.module.css';

const STATUS_LABEL: Record<DiscoveredFile['status'], string> = {
  unrecognized: 'Unrecognized',
  ignored: 'Ignored',
  pending_converter: 'Pending converter',
};

const KB = 1024;
const MB = KB * 1024;

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < KB) return `${bytes} B`;
  if (bytes < MB) return `${(bytes / KB).toFixed(1)} KB`;
  return `${(bytes / MB).toFixed(1)} MB`;
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

export type DiscoveredEntry = DiscoveredFile & { id: string };

export interface DiscoveredFilesListProps {
  files: DiscoveredEntry[];
  loading?: boolean;
  onRefresh: () => Promise<unknown> | unknown;
  now?: number;
}

export function DiscoveredFilesList({
  files,
  loading = false,
  onRefresh,
  now = Date.now(),
}: DiscoveredFilesListProps) {
  if (loading && files.length === 0) {
    return (
      <p className={styles.empty} data-loading>
        Loading discovered files…
      </p>
    );
  }
  if (files.length === 0) {
    return (
      <p className={styles.empty} data-empty-discovered>
        No files in this state.
      </p>
    );
  }
  return (
    <ul className={styles.list} data-discovered-list>
      {files.map((f) => (
        <DiscoveredFileCard key={f.id} file={f} onRefresh={onRefresh} now={now} />
      ))}
    </ul>
  );
}

type FormMode = 'idle' | 'ignore' | 'suggest';

interface DiscoveredFileCardProps {
  file: DiscoveredEntry;
  onRefresh: () => Promise<unknown> | unknown;
  now: number;
}

function DiscoveredFileCard({ file, onRefresh, now }: DiscoveredFileCardProps) {
  const [mode, setMode] = useState<FormMode>('idle');
  const [submitting, setSubmitting] = useState(false);
  const [reason, setReason] = useState('');
  const [converter, setConverter] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  const lastSeen = tsDate(file.last_seen);
  const isResolved = file.status !== 'unrecognized';

  async function classify(action: 'ignore' | 'suggest-converter') {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = { action };
      if (action === 'ignore' && reason.trim()) body.reason = reason.trim();
      if (action === 'suggest-converter') body.suggested_converter = converter.trim();
      const res = await fetch(
        `/api/ops/discovered/${encodeURIComponent(file.id)}/classify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (res.status === 429) {
        const headerValue = res.headers.get('Retry-After');
        const errBody = (await res.json().catch(() => ({}))) as {
          error?: { details?: { retryAfter?: number } };
        };
        const seconds = Number(
          headerValue ?? errBody.error?.details?.retryAfter ?? 60,
        );
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        return;
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      await onRefresh();
      setMode('idle');
      setReason('');
      setConverter('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <li
      className={`${styles.card} ${styles[`card_${file.status}`] ?? ''}`}
      data-discovered={file.id}
      data-status={file.status}
    >
      <div className={styles.summary}>
        <div className={styles.identity}>
          <p className={styles.eyebrow}>File</p>
          <p className={styles.path}>
            <code>{file.path}</code>
          </p>
          <p className={styles.meta}>
            <span className={styles.metaChip} data-meta="ext">
              ext={' '}
              <code>{file.ext || '(none)'}</code>
            </span>
            <span className={styles.metaChip} data-meta="mime">
              mime{' '}
              <code>{file.mime || '(unknown)'}</code>
            </span>
            <span className={styles.metaChip} data-meta="size">
              {formatBytes(file.size_bytes)}
            </span>
            <span className={styles.metaChip} data-meta="runs">
              seen in {file.seen_in_runs.length} run
              {file.seen_in_runs.length === 1 ? '' : 's'}
            </span>
            <span className={styles.metaChip} data-meta="last-seen">
              last {relativeTime(lastSeen, now)}
            </span>
          </p>
        </div>
        <span
          className={`${styles.statusPill} ${styles[`status_${file.status}`] ?? ''}`}
          data-status={file.status}
        >
          {STATUS_LABEL[file.status] ?? file.status}
        </span>
      </div>

      {file.status === 'pending_converter' && file.suggested_converter && (
        <p className={styles.suggestion} data-suggestion>
          <span className={styles.suggestionLabel}>Suggested converter</span>
          <code>{file.suggested_converter}</code>
        </p>
      )}
      {file.status === 'ignored' && file.ignored_reason && (
        <p className={styles.ignoredReason} data-ignored-reason>
          <span className={styles.suggestionLabel}>Ignored</span>
          <span>{file.ignored_reason}</span>
        </p>
      )}

      {!isResolved && (
        <div className={styles.actions} data-actions>
          {retryAfter !== null && (
            <RateLimitAlert
              retryAfterSeconds={retryAfter}
              actionLabel="classifying"
              onExpire={() => setRetryAfter(null)}
            />
          )}
          {mode === 'idle' && (
            <>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonSecondary}`}
                onClick={() => setMode('ignore')}
                disabled={retryAfter !== null}
                data-action="open-ignore"
              >
                Ignore
              </button>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => setMode('suggest')}
                disabled={retryAfter !== null}
                data-action="open-suggest"
              >
                Suggest converter
              </button>
            </>
          )}

          {mode === 'ignore' && (
            <form
              className={styles.form}
              data-form="ignore"
              onSubmit={(e) => {
                e.preventDefault();
                classify('ignore');
              }}
            >
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Reason (optional)</span>
                <textarea
                  className={styles.textarea}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why ignore this file? (will be stored as ignored_reason)"
                  disabled={submitting}
                />
              </label>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={() => {
                    setMode('idle');
                    setReason('');
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonSecondary}`}
                  disabled={submitting}
                  data-action="confirm-ignore"
                >
                  {submitting ? 'Ignoring…' : 'Confirm ignore'}
                </button>
              </div>
            </form>
          )}

          {mode === 'suggest' && (
            <form
              className={styles.form}
              data-form="suggest"
              onSubmit={(e) => {
                e.preventDefault();
                if (!converter.trim()) return;
                classify('suggest-converter');
              }}
            >
              <label className={styles.fieldGroup}>
                <span className={styles.fieldLabel}>Converter id</span>
                <input
                  type="text"
                  className={styles.textInput}
                  value={converter}
                  onChange={(e) => setConverter(e.target.value)}
                  placeholder="e.g. kml, netcdf, ply"
                  disabled={submitting}
                  data-converter-input
                />
              </label>
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={`${styles.button} ${styles.buttonGhost}`}
                  onClick={() => {
                    setMode('idle');
                    setConverter('');
                    setError(null);
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.button} ${styles.buttonPrimary}`}
                  disabled={submitting || converter.trim().length === 0}
                  data-action="confirm-suggest"
                >
                  {submitting ? 'Suggesting…' : 'Suggest converter'}
                </button>
              </div>
            </form>
          )}

          {error && (
            <p className={styles.error} role="alert" data-discovered-error>
              {error}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
