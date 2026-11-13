import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore, useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { timeStepAtom, timeRangeAtom } from '@/atoms';
import {
  useTimeStepUrlSync,
  isoMonthsSinceEpoch,
  closestRangeIndex,
} from '@/atoms/url-sync';

function Probe() {
  useTimeStepUrlSync();
  const [step, setStep] = useAtom(timeStepAtom);
  const [range] = useAtom(timeRangeAtom);
  return (
    <>
      <span data-testid="iso">{range[step]?.slice(0, 7) ?? ''}</span>
      <button onClick={() => setStep(13)}>step 13</button>
    </>
  );
}

// Each render gets its own Jotai store so the timeStepAtom doesn't leak
// across tests (the URL → atom path is intentionally a no-op when the URL
// is unparsable, so a leftover step from a prior test would mask the
// fallback case).
describe('REQ-SM-011 — timeStep URL sync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('writes ?t=YYYY-MM (not the numeric index) on atom change', async () => {
    const user = userEvent.setup();
    const captured: { params: URLSearchParams | null; mode: string | undefined } = {
      params: null,
      mode: undefined,
    };
    render(
      <Provider store={createStore()}>
        <NuqsTestingAdapter
          onUrlUpdate={(e) => {
            captured.params = e.searchParams;
            captured.mode = e.options.history;
          }}
        >
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    // step 13 → range[13] = '2025-02-01' → ?t=2025-02
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('t')).toBe('2025-02');
    expect(captured.mode).toBe('replace');
  });

  it('reads ?t= into the matching index on mount', () => {
    render(
      <Provider store={createStore()}>
        <NuqsTestingAdapter searchParams="?t=2025-06">
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    // 2025-06 should map to step index 17 (Jan 2024 = 0, ..., Jun 2025 = 17)
    expect(screen.getByTestId('iso')).toHaveTextContent('2025-06');
  });

  it('ignores unparsable ?t= values gracefully', () => {
    render(
      <Provider store={createStore()}>
        <NuqsTestingAdapter searchParams="?t=not-a-date">
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    // Malformed (not a valid YYYY-MM) → no closest match either, atom stays
    // at default 0 → 2024-01.
    expect(screen.getByTestId('iso')).toHaveTextContent('2024-01');
  });

  it('snaps an out-of-range ?t= value to the closest entry + warns', () => {
    // Default range covers 2024-01..2025-12. `2030-06` is beyond the end of
    // the range — the hook should snap to the closest entry (2025-12) and
    // emit a console.warn so the snap is visible.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      render(
        <Provider store={createStore()}>
          <NuqsTestingAdapter searchParams="?t=2030-06">
            <Probe />
          </NuqsTestingAdapter>
        </Provider>,
      );
      expect(screen.getByTestId('iso')).toHaveTextContent('2025-12');
      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]?.[0]).toMatch(
        /\[useTimeStepUrlSync\] \?t=2030-06 not in current timeRange/,
      );
      expect(warn.mock.calls[0]?.[0]).toMatch(/snapping to closest entry 2025-12/);
    } finally {
      warn.mockRestore();
    }
  });

  it('snaps a before-range ?t= value to the closest (first) entry', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      render(
        <Provider store={createStore()}>
          <NuqsTestingAdapter searchParams="?t=2020-01">
            <Probe />
          </NuqsTestingAdapter>
        </Provider>,
      );
      expect(screen.getByTestId('iso')).toHaveTextContent('2024-01');
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('isoMonthsSinceEpoch', () => {
  it('parses YYYY-MM into a strictly-monotonic integer', () => {
    expect(isoMonthsSinceEpoch('2024-01')).toBeLessThan(
      isoMonthsSinceEpoch('2024-02')!,
    );
    expect(isoMonthsSinceEpoch('2024-12')).toBeLessThan(
      isoMonthsSinceEpoch('2025-01')!,
    );
    expect(isoMonthsSinceEpoch('2024-06')).toBe(2024 * 12 + 5);
  });

  it('rejects malformed input', () => {
    expect(isoMonthsSinceEpoch('not-a-date')).toBeNull();
    expect(isoMonthsSinceEpoch('2024-13')).toBeNull(); // month out of range
    expect(isoMonthsSinceEpoch('2024-00')).toBeNull();
    expect(isoMonthsSinceEpoch('24-06')).toBeNull(); // 2-digit year
    expect(isoMonthsSinceEpoch('2024-06-15')).toBeNull(); // full date, not month
    expect(isoMonthsSinceEpoch('')).toBeNull();
  });
});

describe('closestRangeIndex', () => {
  const range = ['2024-01', '2024-06', '2024-12', '2025-06', '2025-12'];

  it('returns the exact index when the target matches an entry', () => {
    expect(closestRangeIndex(range, '2024-06')).toBe(1);
    expect(closestRangeIndex(range, '2025-12')).toBe(4);
  });

  it('snaps to the closest entry by month-distance', () => {
    expect(closestRangeIndex(range, '2024-08')).toBe(1); // 2 mo from 2024-06, 4 mo from 2024-12
    expect(closestRangeIndex(range, '2024-10')).toBe(2); // 4 mo from 2024-06, 2 mo from 2024-12
    expect(closestRangeIndex(range, '2030-01')).toBe(4); // last entry wins for far-future
    expect(closestRangeIndex(range, '2020-01')).toBe(0); // first entry wins for far-past
  });

  it('returns the lower index on a tie', () => {
    // 2024-09 is 3 mo from 2024-06 and 3 mo from 2024-12 — first match wins.
    expect(closestRangeIndex(range, '2024-09')).toBe(1);
  });

  it('returns null for malformed target', () => {
    expect(closestRangeIndex(range, 'garbage')).toBeNull();
  });

  it('returns null for an empty range', () => {
    expect(closestRangeIndex([], '2024-06')).toBeNull();
  });

  it('skips unparseable entries in range', () => {
    expect(closestRangeIndex(['garbage', '2024-06'], '2024-08')).toBe(1);
  });
});
