/**
 * REQ-CO-018: useCoastalScenarioImpact hook
 *
 * Tests:
 * 1. Delta computation: scenarioValue - basecaseValue per polygon, negative = improvement
 * 2. Missing scenario returns empty maps (waveDeltas, erosionDeltas, servicesDeltas)
 * 3. BaseCase self-delta = 0 for all polygons
 * 4. Sign correctness: negative delta (scenario < basecase) means improvement
 * 5. Loading state returns loading: true
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
}));

import useSWR from 'swr';
const mockUseSWR = useSWR as ReturnType<typeof vi.fn>;

import {
  computeScenarioDelta,
  useCoastalScenarioImpact,
} from '@/lib/data/hooks/useCoastalScenarioImpact';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal FetcherResult payload with rows */
function makeRows(rows: Array<{ Polygon_ID: string; value: number }>) {
  return {
    data: { rows },
    status: 200,
    datasetId: 'test',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Delta computation: scenarioValue - basecaseValue per polygon
// ---------------------------------------------------------------------------
describe('REQ-CO-018: computeScenarioDelta', () => {
  it('computes delta = scenarioValue - basecaseValue per polygon', () => {
    const scenarioRows = [
      { Polygon_ID: 'P1', value: 30 },
      { Polygon_ID: 'P2', value: 20 },
    ];
    const basecaseRows = [
      { Polygon_ID: 'P1', value: 50 },
      { Polygon_ID: 'P2', value: 25 },
    ];

    const deltas = computeScenarioDelta(scenarioRows, basecaseRows, 'value');

    expect(deltas.get('P1')).toBe(-20); // 30 - 50 = -20
    expect(deltas.get('P2')).toBe(-5);  // 20 - 25 = -5
  });

  it('returns negative delta for improvement (scenario < basecase)', () => {
    const scenarioRows = [{ Polygon_ID: 'P1', value: 10 }];
    const basecaseRows = [{ Polygon_ID: 'P1', value: 40 }];

    const deltas = computeScenarioDelta(scenarioRows, basecaseRows, 'value');
    expect(deltas.get('P1')).toBeLessThan(0);
  });

  it('skips polygons missing in scenario output', () => {
    const scenarioRows = [{ Polygon_ID: 'P1', value: 20 }];
    const basecaseRows = [
      { Polygon_ID: 'P1', value: 30 },
      { Polygon_ID: 'P2', value: 25 },
    ];

    const deltas = computeScenarioDelta(scenarioRows, basecaseRows, 'value');
    expect(deltas.get('P1')).toBe(-10);
    expect(deltas.has('P2')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. Missing scenario (scenarioId = null) returns empty maps, loading = false
// ---------------------------------------------------------------------------
describe('REQ-CO-018: null scenarioId returns empty maps', () => {
  it('returns empty waveDeltas, erosionDeltas, servicesDeltas when scenarioId is null', () => {
    const result = useCoastalScenarioImpact(null, 'placencia', 'hires');

    expect(result.loading).toBe(false);
    expect(result.waveDeltas.size).toBe(0);
    expect(result.erosionDeltas.size).toBe(0);
    expect(result.servicesDeltas.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 3. BaseCase self-delta = 0 for all polygons
// ---------------------------------------------------------------------------
describe('REQ-CO-018: basecase self-delta = 0', () => {
  it('returns delta=0 for all polygons when scenarioId is "basecase"', () => {
    const basecasePayload = makeRows([
      { Polygon_ID: 'P1', value: 50 },
      { Polygon_ID: 'P2', value: 30 },
    ]);

    // SWR returns same basecase data for all calls
    mockUseSWR.mockReturnValue({
      data: basecasePayload,
      isLoading: false,
      error: null,
    });

    const result = useCoastalScenarioImpact('basecase', 'placencia', 'hires');

    expect(result.loading).toBe(false);
    // All deltas must be 0 (basecase - basecase)
    result.waveDeltas.forEach((delta) => expect(delta).toBe(0));
    result.erosionDeltas.forEach((delta) => expect(delta).toBe(0));
    result.servicesDeltas.forEach((delta) => expect(delta).toBe(0));
  });
});

// ---------------------------------------------------------------------------
// 4. Sign correctness: negative delta = improvement
// ---------------------------------------------------------------------------
describe('REQ-CO-018: sign correctness', () => {
  it('negative delta when scenario value is lower than basecase', () => {
    const scenarioPayload = makeRows([{ Polygon_ID: 'P1', value: 20 }]);
    const basecasePayload = makeRows([{ Polygon_ID: 'P1', value: 50 }]);

    let callCount = 0;
    mockUseSWR.mockImplementation(() => {
      callCount++;
      // Alternate: scenario data first 3 calls, basecase next 3
      if (callCount <= 3) {
        return { data: scenarioPayload, isLoading: false, error: null };
      }
      return { data: basecasePayload, isLoading: false, error: null };
    });

    const result = useCoastalScenarioImpact('restoration', 'placencia', 'hires');

    // At least one delta should be negative (scenario < basecase)
    const allDeltas = [
      ...result.waveDeltas.values(),
      ...result.erosionDeltas.values(),
      ...result.servicesDeltas.values(),
    ];
    const hasNegativeDelta = allDeltas.some((d) => d < 0);
    expect(hasNegativeDelta).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 5. Loading state when SWR is still loading
// ---------------------------------------------------------------------------
describe('REQ-CO-018: loading state', () => {
  it('returns loading=true when SWR is loading', () => {
    mockUseSWR.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    const result = useCoastalScenarioImpact('restoration', 'placencia', 'hires');

    expect(result.loading).toBe(true);
  });
});
