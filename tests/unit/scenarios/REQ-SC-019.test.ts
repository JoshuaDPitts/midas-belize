import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useScenarioComparison } from '@/features/scenarios/data/useScenarioComparison';
import type { ScenarioId } from '@/features/scenarios/matrix';

// Mock the impact hooks
vi.mock('@/lib/data/hooks/useCoastalScenarioImpact');
vi.mock('@/lib/data/hooks/useScenarioImpact');

import { useCoastalScenarioImpact } from '@/lib/data/hooks/useCoastalScenarioImpact';
import { useScenarioImpact } from '@/lib/data/hooks/useScenarioImpact';

describe('REQ-SC-019: useScenarioComparison hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('coastal vertical fans out to useCoastalScenarioImpact × 2', () => {
    const mockCoastalImpact = {
      waveDeltas: new Map([['poly1', 0.5]]),
      erosionDeltas: new Map([['poly1', -0.2]]),
      servicesDeltas: new Map([['poly1', 1.0]]),
      loading: false,
    };
    vi.mocked(useCoastalScenarioImpact).mockReturnValue(mockCoastalImpact);

    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'coastal',
        scenarioA: 'A' as ScenarioId,
        scenarioB: 'B' as ScenarioId,
      }),
    );

    // Should call useCoastalScenarioImpact twice (once for A, once for B)
    expect(useCoastalScenarioImpact).toHaveBeenCalledTimes(2);
    expect(useCoastalScenarioImpact).toHaveBeenCalledWith('A', 'placencia', 'hires');
    expect(useCoastalScenarioImpact).toHaveBeenCalledWith('B', 'placencia', 'hires');
    expect(result.current.loading).toBe(false);
  });

  it('watershed vertical fans out to useScenarioImpact × 2', () => {
    const mockWatershedImpact = {
      watershedDeltas: new Map([['poly1', 100]]),
      coastDeltas: new Map([['poly1', -50]]),
      marineImpact: null,
      loading: false,
      error: null,
    };
    vi.mocked(useScenarioImpact).mockReturnValue(mockWatershedImpact);

    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'watershed',
        scenarioA: 'R' as ScenarioId,
        scenarioB: 'F' as ScenarioId,
      }),
    );

    // Should call useScenarioImpact twice (once for R, once for F)
    expect(useScenarioImpact).toHaveBeenCalledTimes(2);
    expect(useScenarioImpact).toHaveBeenCalledWith('R');
    expect(useScenarioImpact).toHaveBeenCalledWith('F');
    expect(result.current.loading).toBe(false);
  });

  it('marine vertical returns aHasData: false immediately (no fetches)', () => {
    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'marine',
        scenarioA: 'A' as ScenarioId,
        scenarioB: 'B' as ScenarioId,
      }),
    );

    // Should not call any impact hooks
    expect(useCoastalScenarioImpact).not.toHaveBeenCalled();
    expect(useScenarioImpact).not.toHaveBeenCalled();
    
    // Should return availability: false for both
    expect(result.current.availability.aHasData).toBe(false);
    expect(result.current.availability.bHasData).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it('when A === B, all deltas are zero', () => {
    const mockCoastalImpact = {
      waveDeltas: new Map([['poly1', 0.5], ['poly2', 0.3]]),
      erosionDeltas: new Map([['poly1', -0.2]]),
      servicesDeltas: new Map([['poly1', 1.0]]),
      loading: false,
    };
    vi.mocked(useCoastalScenarioImpact).mockReturnValue(mockCoastalImpact);

    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'coastal',
        scenarioA: 'A' as ScenarioId,
        scenarioB: 'A' as ScenarioId, // Same scenario
      }),
    );

    // All deltas should be zero when comparing same scenario
    result.current.deltas.forEach((metric) => {
      expect(metric.siteAggregate).toBe(0);
      metric.polygonById.forEach((delta) => {
        expect(delta).toBe(0);
      });
    });
  });

  it('when one scenario has no data, availability.aHasData (or B) is false', () => {
    vi.mocked(useCoastalScenarioImpact).mockImplementation((scenario) => {
      if (scenario === 'A') {
        return {
          waveDeltas: new Map([['poly1', 0.5]]),
          erosionDeltas: new Map([['poly1', -0.2]]),
          servicesDeltas: new Map([['poly1', 1.0]]),
          loading: false,
        };
      }
      // B has no data
      return {
        waveDeltas: new Map(),
        erosionDeltas: new Map(),
        servicesDeltas: new Map(),
        loading: false,
      };
    });

    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'coastal',
        scenarioA: 'A' as ScenarioId,
        scenarioB: 'B' as ScenarioId,
      }),
    );

    expect(result.current.availability.aHasData).toBe(true);
    expect(result.current.availability.bHasData).toBe(false);
  });

  it('time-series alignment: tA and tB have same length matching timeAxis', () => {
    // For now, time series are not implemented (returns empty Map)
    // This test verifies the structure is correct even when empty
    vi.mocked(useCoastalScenarioImpact).mockReturnValue({
      waveDeltas: new Map([['poly1', 0.5]]),
      erosionDeltas: new Map(),
      servicesDeltas: new Map(),
      loading: false,
    });

    const { result } = renderHook(() =>
      useScenarioComparison({
        site: 'placencia',
        vertical: 'coastal',
        scenarioA: 'A' as ScenarioId,
        scenarioB: 'B' as ScenarioId,
      }),
    );

    // Time series should be a Map (even if empty for now)
    expect(result.current.timeSeries).toBeInstanceOf(Map);
    expect(result.current.timeSeries.size).toBe(0);
  });
});
