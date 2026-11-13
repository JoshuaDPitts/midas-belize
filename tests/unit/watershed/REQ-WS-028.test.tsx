import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';

beforeEach(() => {
  // atomWithStorage hydrates from localStorage on first read; clear it
  // so each test starts with default atom values.
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
import {
  rfactorMonthAtom,
  manualMonthOverrideAtom,
} from '@/atoms';
import {
  RainfallSeasonality,
  BELIZE_MONTHLY_R_FRACTION,
  summarisePeakMonth,
} from '@/features/watershed/domain/RainfallSeasonality';

function renderGrid() {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <RainfallSeasonality />
      </Provider>,
    ),
  };
}

describe('REQ-WS-028: RainfallSeasonality', () => {
  describe('summarisePeakMonth', () => {
    it('returns the index + label of the largest fraction', () => {
      // Belize climatology peak is September (index 8).
      const s = summarisePeakMonth(BELIZE_MONTHLY_R_FRACTION);
      expect(s.peakIdx).toBe(8);
      expect(s.peakLabel).toBe('Sep');
      // peakRatio = peak/annualMean where annualMean = 1/12 = 0.0833
      // 0.161 / 0.0833 ≈ 1.93
      expect(s.peakRatio).toBeGreaterThan(1.5);
      expect(s.peakRatio).toBeLessThan(2.5);
    });

    it('handles an all-equal climatology with peakRatio ≈ 1', () => {
      const flat = new Array(12).fill(1 / 12);
      const s = summarisePeakMonth(flat);
      expect(s.peakRatio).toBeCloseTo(1, 5);
    });
  });

  describe('rendering', () => {
    it('renders 12 month tiles', () => {
      renderGrid();
      for (const label of ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']) {
        expect(screen.getByTestId(`rainfall-month-${label}`)).toBeInTheDocument();
      }
    });

    it('renders the peak-month caption', () => {
      renderGrid();
      expect(screen.getByTestId('rainfall-peak-caption')).toHaveTextContent(/Sep/);
      expect(screen.getByTestId('rainfall-peak-caption')).toHaveTextContent(/annual mean/);
    });

    it('clicking a tile sets rfactorMonthAtom + manualMonthOverrideAtom', async () => {
      const user = userEvent.setup();
      const { store } = renderGrid();
      await user.click(screen.getByTestId('rainfall-month-jul'));
      expect(store.get(rfactorMonthAtom)).toBe(7);
      expect(store.get(manualMonthOverrideAtom)).toBe(true);
    });

    it('shows "Resume timeline" footer only when a month is picked', async () => {
      const user = userEvent.setup();
      renderGrid();
      expect(screen.queryByTestId('rainfall-resume-timeline')).toBeNull();
      await user.click(screen.getByTestId('rainfall-month-may'));
      expect(screen.getByTestId('rainfall-resume-timeline')).toBeInTheDocument();
    });

    it('Resume timeline clears both atoms', async () => {
      const user = userEvent.setup();
      const { store } = renderGrid();
      await user.click(screen.getByTestId('rainfall-month-may'));
      await user.click(screen.getByTestId('rainfall-resume-timeline'));
      expect(store.get(rfactorMonthAtom)).toBeNull();
      expect(store.get(manualMonthOverrideAtom)).toBe(false);
    });

    it('marks the active month tile with aria-checked', async () => {
      const user = userEvent.setup();
      renderGrid();
      const julTile = screen.getByTestId('rainfall-month-jul');
      expect(julTile.getAttribute('aria-checked')).toBe('false');
      await user.click(julTile);
      expect(julTile.getAttribute('aria-checked')).toBe('true');
    });
  });
});
