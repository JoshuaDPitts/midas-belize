// src/lib/map/perf/perfMetrics.ts
// ME-014 — pure perf measurement helpers. Numbers in / numbers out.
// Used by the live stress harness and by unit tests.

export interface FrameReport {
  durationMs: number;
  frameCount: number;
  /** Inter-frame durations in ms (length = frameCount - 1). */
  samples: number[];
  /** Median frame time in ms. */
  medianMs: number;
  /** 95th percentile frame time in ms. */
  p95Ms: number;
  /** Median frame-rate (fps = 1000 / medianMs). */
  medianFps: number;
  /** Worst-case fps derived from p95 frame time. */
  minFps: number;
}

export interface HeapReport {
  usedBytes: number;
  /** Bytes the runtime has allocated ahead. */
  totalBytes: number;
}

/** Sort ascending + return the middle value. Returns 0 for empty input. */
export function median(nums: readonly number[]): number {
  if (nums.length === 0) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/** Linear-interpolated percentile. `p` is 0..100. */
export function percentile(nums: readonly number[], p: number): number {
  if (nums.length === 0) return 0;
  const clamped = Math.max(0, Math.min(100, p));
  const sorted = [...nums].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const pos = (clamped / 100) * (sorted.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
}

/** Assemble a FrameReport from raw frame timestamps (from performance.now()). */
export function summarizeFrames(timestamps: readonly number[]): FrameReport {
  if (timestamps.length < 2) {
    return {
      durationMs: 0,
      frameCount: timestamps.length,
      samples: [],
      medianMs: 0,
      p95Ms: 0,
      medianFps: 0,
      minFps: 0,
    };
  }
  const samples: number[] = [];
  for (let i = 1; i < timestamps.length; i++) {
    samples.push(timestamps[i] - timestamps[i - 1]);
  }
  const medMs = median(samples);
  const p95 = percentile(samples, 95);
  return {
    durationMs: timestamps[timestamps.length - 1] - timestamps[0],
    frameCount: timestamps.length,
    samples,
    medianMs: medMs,
    p95Ms: p95,
    medianFps: medMs > 0 ? 1000 / medMs : 0,
    minFps: p95 > 0 ? 1000 / p95 : 0,
  };
}

/** Sample frame timestamps via `requestAnimationFrame` for ~durationMs. */
export function recordFrames(durationMs: number): Promise<FrameReport> {
  return new Promise((resolve) => {
    if (typeof performance === 'undefined' || typeof requestAnimationFrame === 'undefined') {
      resolve(summarizeFrames([]));
      return;
    }
    const stamps: number[] = [];
    const start = performance.now();
    const tick = (now: number) => {
      stamps.push(now);
      if (now - start >= durationMs) {
        resolve(summarizeFrames(stamps));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Read Chrome's non-standard `performance.memory`. Returns null if absent. */
export function readHeap(): HeapReport | null {
  if (typeof performance === 'undefined') return null;
  const m = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory;
  if (!m) return null;
  return { usedBytes: m.usedJSHeapSize, totalBytes: m.totalJSHeapSize };
}

/** Spec budget constants exposed so the UI + tests read the same source. */
export const PERF_TARGETS = {
  medianFpsMin: 55,
  addRemoveMsMax: 500,
  coldRenderMsMax: 2000,
  heapGrowthPctMax: 10,
} as const;

/** Pass / fail envelope a consumer can render inline next to the raw metrics. */
export interface PerfVerdict {
  fps: { value: number; pass: boolean };
  addRemove?: { value: number; pass: boolean };
  heapDeltaPct?: { value: number; pass: boolean };
}

export function evaluate(
  frames: FrameReport,
  extras: { addRemoveMs?: number; heapBefore?: HeapReport | null; heapAfter?: HeapReport | null } = {},
): PerfVerdict {
  const v: PerfVerdict = {
    fps: { value: frames.medianFps, pass: frames.medianFps >= PERF_TARGETS.medianFpsMin },
  };
  if (extras.addRemoveMs !== undefined) {
    v.addRemove = {
      value: extras.addRemoveMs,
      pass: extras.addRemoveMs <= PERF_TARGETS.addRemoveMsMax,
    };
  }
  if (extras.heapBefore && extras.heapAfter) {
    const pct =
      ((extras.heapAfter.usedBytes - extras.heapBefore.usedBytes) / extras.heapBefore.usedBytes) *
      100;
    v.heapDeltaPct = { value: pct, pass: pct <= PERF_TARGETS.heapGrowthPctMax };
  }
  return v;
}
