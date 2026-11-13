'use client';
import { useEffect, useState } from 'react';
import { useRun } from './useRun';
import type { PipelineRun } from '@/lib/data/types';

export type RunPollingStatus =
  | PipelineRun['status']
  | 'idle'
  | 'timed-out';

export interface RunPollingState {
  status: RunPollingStatus;
  run: (PipelineRun & { id: string }) | null;
}

export interface UseRunPollingOptions {
  /** Hard cap on how long we'll wait for a non-terminal run before flipping to `timed-out`. */
  timeoutMs?: number;
  /** Override the SWR poll interval. Defaults to 5s. */
  pollMs?: number;
}

const TERMINAL: ReadonlyArray<PipelineRun['status']> = ['success', 'failed', 'partial'];

export function useRunPolling(
  runId: string | null,
  opts: UseRunPollingOptions = {},
): RunPollingState {
  const timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
  const pollMs = opts.pollMs ?? 5000;
  const { run } = useRun(runId, { pollMs });
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    setTimedOut(false);
    if (!runId) return;
    const timer = setTimeout(() => setTimedOut(true), timeoutMs);
    return () => clearTimeout(timer);
  }, [runId, timeoutMs]);

  if (!runId) return { status: 'idle', run: null };

  // Already-terminal run dominates over a stale timeout flag.
  if (run && TERMINAL.includes(run.status)) {
    return { status: run.status, run };
  }

  if (timedOut) return { status: 'timed-out', run };

  // Optimistic 'running' until we see a payload.
  return { status: run?.status ?? 'running', run: run ?? null };
}
