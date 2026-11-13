'use client';
import { useState } from 'react';
import { RateLimitAlert } from './RateLimitAlert';
import styles from './RerunButton.module.css';

export interface RerunButtonProps {
  datasetId: string;
  onStarted: (runId: string) => void;
}

interface RerunResponse {
  run_id: string;
  github_run_url: string | null;
  status: string;
}

interface ErrorPayload {
  error?: { details?: { retryAfter?: number } };
}

export function RerunButton({ datasetId, onStarted }: RerunButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);

  async function rerun() {
    if (pending || retryAfter !== null) return;
    setPending(true);
    setError(null);
    setRetryAfter(null);
    try {
      const res = await fetch(`/api/ops/rerun/${encodeURIComponent(datasetId)}`, {
        method: 'POST',
      });
      if (res.status === 429) {
        const headerValue = res.headers.get('Retry-After');
        const body = (await res.json().catch(() => ({}))) as ErrorPayload;
        const seconds = Number(
          headerValue ?? body.error?.details?.retryAfter ?? 60,
        );
        setRetryAfter(Number.isFinite(seconds) && seconds > 0 ? seconds : 60);
        return;
      }
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text ? `${res.status}: ${text}` : `HTTP ${res.status}`);
      }
      const body = (await res.json()) as RerunResponse;
      onStarted(body.run_id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setPending(false);
    }
  }

  const blocked = pending || retryAfter !== null;

  return (
    <div className={styles.wrap} data-rerun>
      <button
        type="button"
        className={styles.button}
        onClick={rerun}
        disabled={blocked}
        data-pending={pending || undefined}
        data-rate-limited={retryAfter !== null || undefined}
      >
        <span className={styles.icon} aria-hidden="true">
          {pending ? '⏳' : retryAfter !== null ? '⏱' : '↻'}
        </span>
        <span>
          {pending
            ? 'Triggering rerun…'
            : retryAfter !== null
              ? 'Rate limited'
              : 'Rerun this dataset'}
        </span>
      </button>
      {retryAfter !== null && (
        <RateLimitAlert
          retryAfterSeconds={retryAfter}
          actionLabel="rerunning"
          onExpire={() => setRetryAfter(null)}
        />
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
