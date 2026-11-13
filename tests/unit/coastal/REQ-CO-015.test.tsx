/**
 * REQ-CO-015: MangroveUrbanTrend — dual-line SVG time-series chart
 *
 * Tests:
 * 1. Renders dual-line SVG (has polyline elements, one for mangrove, one for urban)
 * 2. Handles empty time-series gracefully (shows placeholder message)
 * 3. Per-polygon view when selectedPolygonAtom is set vs site-aggregate when null
 * 4. Axis labels present (time axis, area labels)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, coastalResolutionAtom } from '@/atoms';
import type { SelectedPolygonRef } from '@/atoms';
import { MangroveUrbanTrend } from '@/features/coastal/domain/MangroveUrbanTrend';

// ---------------------------------------------------------------------------
// Mock useCoastalForSite
// ---------------------------------------------------------------------------
vi.mock('@/lib/data/hooks/useCoastalForSite', () => ({
  useCoastalForSite: vi.fn(),
}));

import { useCoastalForSite } from '@/lib/data/hooks/useCoastalForSite';
const mockUseCoastalForSite = useCoastalForSite as ReturnType<typeof vi.fn>;

// Time series data: 3 year steps, 2 polygons
const MOCK_LANDCOVER = [
  { Polygon_ID: 'P1', year: 2020, Mangrove_Area: 120, Urban_Area: 40 },
  { Polygon_ID: 'P1', year: 2021, Mangrove_Area: 110, Urban_Area: 50 },
  { Polygon_ID: 'P1', year: 2022, Mangrove_Area: 100, Urban_Area: 60 },
  { Polygon_ID: 'P2', year: 2020, Mangrove_Area: 80, Urban_Area: 30 },
  { Polygon_ID: 'P2', year: 2021, Mangrove_Area: 75, Urban_Area: 35 },
  { Polygon_ID: 'P2', year: 2022, Mangrove_Area: 70, Urban_Area: 40 },
];

function makeJoinedAttrs(landcover = MOCK_LANDCOVER) {
  return {
    nbs: [],
    clade: [],
    urbanRatio: [],
    landcover,
    fetch: [],
    erosion: [],
  };
}

function renderWith(
  options: {
    landcover?: typeof MOCK_LANDCOVER;
    site?: string | null;
    selectedPolygon?: SelectedPolygonRef | null;
    loading?: boolean;
  } = {},
) {
  const {
    landcover = MOCK_LANDCOVER,
    site = 'placencia',
    selectedPolygon = null,
    loading = false,
  } = options;

  const store = createStore();
  if (selectedPolygon) {
    store.set(selectedPolygonAtom, selectedPolygon);
  }

  mockUseCoastalForSite.mockReturnValue({
    geometry: null,
    joinedAttrs: loading ? null : makeJoinedAttrs(landcover),
    loading,
    error: null,
  });

  return {
    store,
    ...render(
      <Provider store={store}>
        <MangroveUrbanTrend site={site as never} />
      </Provider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Renders dual-line SVG
// ---------------------------------------------------------------------------
describe('REQ-CO-015: dual-line SVG', () => {
  it('renders an SVG element', () => {
    const { container } = renderWith();
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('renders at least 2 polyline elements (mangrove + urban)', () => {
    const { container } = renderWith();
    const polylines = container.querySelectorAll('polyline');
    expect(polylines.length).toBeGreaterThanOrEqual(2);
  });

  it('mangrove polyline has data-series="mangrove"', () => {
    const { container } = renderWith();
    const mangroveLine = container.querySelector('[data-series="mangrove"]');
    expect(mangroveLine).toBeInTheDocument();
  });

  it('urban polyline has data-series="urban"', () => {
    const { container } = renderWith();
    const urbanLine = container.querySelector('[data-series="urban"]');
    expect(urbanLine).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Empty time-series gracefully handled
// ---------------------------------------------------------------------------
describe('REQ-CO-015: empty state', () => {
  it('shows placeholder message when landcover is empty', () => {
    renderWith({ landcover: [] });
    expect(screen.getByTestId('mangrove-trend-empty')).toBeInTheDocument();
  });

  it('shows placeholder message when joinedAttrs is null (loading)', () => {
    renderWith({ loading: true });
    expect(screen.getByTestId('mangrove-trend-empty')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Per-polygon view vs site-aggregate
// ---------------------------------------------------------------------------
describe('REQ-CO-015: per-polygon vs aggregate view', () => {
  it('shows "All polygons" label when no polygon selected', () => {
    renderWith({ selectedPolygon: null });
    expect(screen.getByText(/all polygons/i)).toBeInTheDocument();
  });

  it('shows polygon id label when a polygon is selected', () => {
    renderWith({
      selectedPolygon: { layerId: 'coastal-polygons', featureId: 'P1' },
    });
    expect(screen.getByText(/P1/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Axis labels present
// ---------------------------------------------------------------------------
describe('REQ-CO-015: axis labels', () => {
  it('renders a time axis label', () => {
    renderWith();
    // Should have at least one year label from data (2020, 2021, 2022)
    expect(screen.getByText('2020')).toBeInTheDocument();
  });

  it('renders mangrove area legend label', () => {
    renderWith();
    // Multiple elements may match (header title + legend item)
    const items = screen.getAllByText(/mangrove/i);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders urban area legend label', () => {
    renderWith();
    // Multiple elements may match (header title + legend item)
    const items = screen.getAllByText(/urban/i);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });
});
