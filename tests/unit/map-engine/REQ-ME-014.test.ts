// tests/unit/map-engine/REQ-ME-014.test.ts
// ME-014 — pure perf math + verdict helpers.
import { describe, it, expect } from 'vitest';
import {
  median,
  percentile,
  summarizeFrames,
  evaluate,
  PERF_TARGETS,
} from '@/lib/map/perf/perfMetrics';

describe('REQ-ME-014: median', () => {
  it('returns the middle element of an odd-length list', () => {
    expect(median([3, 1, 2])).toBe(2);
  });

  it('averages the two middle elements of an even-length list', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5);
  });

  it('does not mutate the input', () => {
    const input = [5, 2, 9, 1];
    median(input);
    expect(input).toEqual([5, 2, 9, 1]);
  });

  it('returns 0 for empty input', () => {
    expect(median([])).toBe(0);
  });
});

describe('REQ-ME-014: percentile', () => {
  it('computes the 95th percentile with linear interpolation', () => {
    const xs = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    // Between index 8 and 9 at position 9×0.95 = 8.55 → 90 + 0.55×(100-90) = 95.5
    expect(percentile(xs, 95)).toBeCloseTo(95.5, 5);
  });

  it('returns the single value for a 1-element list', () => {
    expect(percentile([42], 95)).toBe(42);
    expect(percentile([42], 0)).toBe(42);
  });

  it('clamps p into [0, 100]', () => {
    expect(percentile([1, 2, 3], -5)).toBe(1);
    expect(percentile([1, 2, 3], 200)).toBe(3);
  });

  it('returns 0 for empty input', () => {
    expect(percentile([], 50)).toBe(0);
  });
});

describe('REQ-ME-014: summarizeFrames', () => {
  it('reports frameCount, durationMs, median, and p95 from raw timestamps', () => {
    // 10 frames at exactly 60fps = 16.667ms each.
    const dt = 1000 / 60;
    const stamps = Array.from({ length: 10 }, (_, i) => i * dt);
    const r = summarizeFrames(stamps);
    expect(r.frameCount).toBe(10);
    expect(r.samples).toHaveLength(9);
    expect(r.durationMs).toBeCloseTo(9 * dt, 5);
    expect(r.medianMs).toBeCloseTo(dt, 5);
    expect(r.medianFps).toBeCloseTo(60, 0);
  });

  it('handles under-2-sample inputs by returning zeros', () => {
    expect(summarizeFrames([]).frameCount).toBe(0);
    expect(summarizeFrames([100]).frameCount).toBe(1);
    expect(summarizeFrames([100]).medianMs).toBe(0);
  });

  it('captures jank via p95 even when median is smooth', () => {
    // 50 smooth frames + 1 long hitch.
    const stamps: number[] = [];
    let t = 0;
    for (let i = 0; i < 50; i++) { stamps.push(t); t += 16.6; }
    stamps.push(t + 200); // one 200ms hitch
    const r = summarizeFrames(stamps);
    // Median should still be ~16.6 (smooth frames dominate).
    expect(r.medianMs).toBeLessThan(20);
    // p95 picks up the hitch.
    expect(r.p95Ms).toBeGreaterThan(16.6);
  });
});

describe('REQ-ME-014: evaluate', () => {
  it('passes fps when median ≥ target', () => {
    const frames = summarizeFrames([0, 16.66, 33.33, 50, 66.66, 83.33]); // ~60fps
    const v = evaluate(frames);
    expect(v.fps.pass).toBe(true);
    expect(v.fps.value).toBeGreaterThanOrEqual(PERF_TARGETS.medianFpsMin);
  });

  it('fails fps when median < target', () => {
    // 10fps = 100ms per frame.
    const frames = summarizeFrames([0, 100, 200, 300, 400, 500]);
    const v = evaluate(frames);
    expect(v.fps.pass).toBe(false);
  });

  it('includes addRemove verdict when extras provided', () => {
    const frames = summarizeFrames([]);
    const v = evaluate(frames, { addRemoveMs: 120 });
    expect(v.addRemove).toBeDefined();
    expect(v.addRemove!.pass).toBe(true);
    expect(v.addRemove!.value).toBe(120);

    const fail = evaluate(frames, { addRemoveMs: 800 });
    expect(fail.addRemove!.pass).toBe(false);
  });

  it('reports heap delta as a percent and compares to the budget', () => {
    const frames = summarizeFrames([]);
    const v = evaluate(frames, {
      heapBefore: { usedBytes: 100_000_000, totalBytes: 200_000_000 },
      heapAfter:  { usedBytes: 105_000_000, totalBytes: 210_000_000 }, // +5%
    });
    expect(v.heapDeltaPct!.value).toBeCloseTo(5, 5);
    expect(v.heapDeltaPct!.pass).toBe(true);

    const fail = evaluate(frames, {
      heapBefore: { usedBytes: 100_000_000, totalBytes: 200_000_000 },
      heapAfter:  { usedBytes: 115_000_000, totalBytes: 210_000_000 }, // +15%
    });
    expect(fail.heapDeltaPct!.pass).toBe(false);
  });

  it('skips heap verdict when either snapshot is null', () => {
    const frames = summarizeFrames([]);
    const v = evaluate(frames, {
      heapBefore: null,
      heapAfter: { usedBytes: 100, totalBytes: 200 },
    });
    expect(v.heapDeltaPct).toBeUndefined();
  });
});

describe('REQ-ME-014: PERF_TARGETS', () => {
  it('matches the spec budget', () => {
    expect(PERF_TARGETS.medianFpsMin).toBe(55);
    expect(PERF_TARGETS.addRemoveMsMax).toBe(500);
    expect(PERF_TARGETS.coldRenderMsMax).toBe(2000);
    expect(PERF_TARGETS.heapGrowthPctMax).toBe(10);
  });
});
