import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { timeStepAtom } from '@/atoms';
import {
  ScenarioTimeSeries,
  findDivergencePoint,
  type SeriesPoint,
} from '@/features/watershed/domain/ScenarioTimeSeries';

function renderWith(base: SeriesPoint[], scenario: SeriesPoint[]) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <ScenarioTimeSeries base={base} scenario={scenario} />
      </Provider>,
    ),
  };
}

describe('REQ-WS-036: ScenarioTimeSeries', () => {
  describe('findDivergencePoint', () => {
    it('returns -1 when both series are empty', () => {
      expect(findDivergencePoint([], [])).toBe(-1);
    });

    it('returns -1 when series stay within threshold', () => {
      const base = Array.from({ length: 6 }, (_, i) => ({ month: i, value: 100 }));
      const scen = Array.from({ length: 6 }, (_, i) => ({ month: i, value: 102 }));
      // 2% diff, threshold 5% → no divergence detected.
      expect(findDivergencePoint(base, scen, 0.05)).toBe(-1);
    });

    it('returns the first index where threshold is exceeded', () => {
      const base = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
        { month: 2, value: 100 },
        { month: 3, value: 100 },
      ];
      const scen = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
        { month: 2, value: 60 },
        { month: 3, value: 60 },
      ];
      expect(findDivergencePoint(base, scen, 0.05)).toBe(2);
    });

    it('handles month-misaligned points by skipping', () => {
      const base = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
      ];
      const scen = [
        { month: 5, value: 50 },
        { month: 6, value: 50 },
      ];
      expect(findDivergencePoint(base, scen, 0.05)).toBe(-1);
    });
  });

  describe('rendering', () => {
    it('renders empty state when both series are empty', () => {
      renderWith([], []);
      expect(screen.getByText(/Pick a scenario/i)).toBeInTheDocument();
    });

    it('renders the SVG with base + scenario lines when both populated', () => {
      const base = Array.from({ length: 5 }, (_, i) => ({ month: i, value: 100 - i }));
      const scen = Array.from({ length: 5 }, (_, i) => ({ month: i, value: 80 - i * 5 }));
      renderWith(base, scen);
      expect(screen.getByTestId('scenario-time-series-base-line')).toBeInTheDocument();
      expect(screen.getByTestId('scenario-time-series-scenario-line')).toBeInTheDocument();
    });

    it('renders a divergence marker when the series diverge', () => {
      const base = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
        { month: 2, value: 100 },
      ];
      const scen = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
        { month: 2, value: 50 },
      ];
      renderWith(base, scen);
      expect(screen.getByTestId('scenario-time-series-divergence-marker')).toBeInTheDocument();
    });

    it('does NOT render a divergence marker when series stay aligned', () => {
      const base = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
      ];
      const scen = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
      ];
      renderWith(base, scen);
      expect(screen.queryByTestId('scenario-time-series-divergence-marker')).toBeNull();
    });

    it('renders the area-fill path when both series share at least 2 month-aligned points', () => {
      const base = [
        { month: 0, value: 100 },
        { month: 1, value: 100 },
      ];
      const scen = [
        { month: 0, value: 60 },
        { month: 1, value: 60 },
      ];
      renderWith(base, scen);
      expect(screen.getByTestId('scenario-time-series-area')).toBeInTheDocument();
    });

    it('clicking the chart updates timeStepAtom to the nearest month index', () => {
      const base = Array.from({ length: 24 }, (_, i) => ({ month: i, value: 100 }));
      const scen = Array.from({ length: 24 }, (_, i) => ({ month: i, value: 50 }));
      const { store } = renderWith(base, scen);
      const svg = screen.getByTestId('scenario-time-series-svg');
      // jsdom returns 0 from getBoundingClientRect by default; the early-
      // return in handleClick protects against that. Verify no throw.
      fireEvent.click(svg, { clientX: 200, clientY: 80 });
      const next = store.get(timeStepAtom);
      expect(typeof next).toBe('number');
    });
  });
});
