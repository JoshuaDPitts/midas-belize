import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  ErosionAttributionChart,
  type ElevBinRow,
  aggregateBins,
  binsForPolygon,
} from '@/features/watershed/domain/ErosionAttributionChart';

const FIXTURE_ROWS: ElevBinRow[] = [
  { Polygon_ID: 'Big Creek', BIN_ID: 1, BIN_Label: '0-10m', erosion_kg_yr: 100 },
  { Polygon_ID: 'Big Creek', BIN_ID: 2, BIN_Label: '10-25m', erosion_kg_yr: 240 },
  { Polygon_ID: 'Big Creek', BIN_ID: 3, BIN_Label: '25-50m', erosion_kg_yr: 60 },
  { Polygon_ID: 'Sennis', BIN_ID: 1, BIN_Label: '0-10m', erosion_kg_yr: 70 },
  { Polygon_ID: 'Sennis', BIN_ID: 2, BIN_Label: '10-25m', erosion_kg_yr: 130 },
];

const mockHook = vi.fn();

vi.mock('@/lib/data/hooks/useErosionAttribution', () => ({
  useErosionAttribution: (polygonId: string | number | null) => mockHook(polygonId),
}));

function renderChart(polygonId: string | number | null) {
  const store = createStore();
  return render(
    <Provider store={store}>
      <ErosionAttributionChart polygonId={polygonId} />
    </Provider>,
  );
}

describe('REQ-WS-014: ErosionAttributionChart', () => {
  beforeEach(() => {
    mockHook.mockReset();
  });

  describe('aggregators', () => {
    it('binsForPolygon filters rows by Polygon_ID', () => {
      const out = binsForPolygon(FIXTURE_ROWS, 'Big Creek');
      expect(out).toHaveLength(3);
      expect(out.every((r) => r.Polygon_ID === 'Big Creek')).toBe(true);
    });

    it('binsForPolygon normalises float-style ids ("17.0" === "17")', () => {
      const rows: ElevBinRow[] = [
        { Polygon_ID: '17.0', BIN_ID: 1, BIN_Label: 'a', erosion_kg_yr: 1 },
        { Polygon_ID: '18', BIN_ID: 1, BIN_Label: 'a', erosion_kg_yr: 2 },
      ];
      expect(binsForPolygon(rows, 17)).toHaveLength(1);
      expect(binsForPolygon(rows, '17')).toHaveLength(1);
    });

    it('aggregateBins sums erosion_kg_yr across all polygons per bin', () => {
      const agg = aggregateBins(FIXTURE_ROWS);
      const byBin = Object.fromEntries(agg.map((b) => [b.BIN_ID, b.erosion_kg_yr]));
      expect(byBin[1]).toBe(170);
      expect(byBin[2]).toBe(370);
      expect(byBin[3]).toBe(60);
    });

    it('aggregateBins sorts bins by BIN_ID ascending', () => {
      const agg = aggregateBins(FIXTURE_ROWS);
      const ids = agg.map((b) => b.BIN_ID);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });
  });

  describe('rendering', () => {
    it('renders bars from fixture rows for a selected polygon', () => {
      mockHook.mockReturnValue({ rows: FIXTURE_ROWS, loading: false });
      const { container } = renderChart('Big Creek');
      const bars = container.querySelectorAll('[data-testid^="erosion-bar-"]');
      expect(bars.length).toBe(3);
    });

    it('aggregates when polygonId is null', () => {
      mockHook.mockReturnValue({ rows: FIXTURE_ROWS, loading: false });
      const { container } = renderChart(null);
      const bars = container.querySelectorAll('[data-testid^="erosion-bar-"]');
      expect(bars.length).toBe(3);
    });

    it('passes polygonId through to the hook', () => {
      mockHook.mockReturnValue({ rows: [], loading: false });
      renderChart('Big Creek');
      expect(mockHook).toHaveBeenCalledWith('Big Creek');
    });

    it('renders empty state when hook returns no rows', () => {
      mockHook.mockReturnValue({ rows: [], loading: false });
      renderChart('Big Creek');
      expect(screen.getByTestId('erosion-attribution-empty')).toBeInTheDocument();
    });

    it('renders loading state while hook reports loading', () => {
      mockHook.mockReturnValue({ rows: [], loading: true });
      renderChart('Big Creek');
      expect(screen.getByTestId('erosion-attribution-loading')).toBeInTheDocument();
    });

    it('renders y-axis tick labels with kg/yr units', () => {
      mockHook.mockReturnValue({ rows: FIXTURE_ROWS, loading: false });
      renderChart('Big Creek');
      expect(screen.getByText(/kg\/yr/i)).toBeInTheDocument();
    });
  });
});
