/**
 * REQ-CO-016: UrbanEncroachmentBars — per-polygon horizontal bar chart
 *
 * Tests:
 * 1. Renders horizontal bars sorted by urban ratio descending
 * 2. Hover dispatches hoveredPolygonAtom
 * 3. Click dispatches selectedPolygonAtom
 * 4. Selected polygon has accent highlight (data-selected attribute or CSS class)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, hoveredPolygonAtom, coastalResolutionAtom } from '@/atoms';
import { UrbanEncroachmentBars } from '@/features/coastal/domain/UrbanEncroachmentBars';

// ---------------------------------------------------------------------------
// Mock useCoastalVulnerability
// ---------------------------------------------------------------------------
vi.mock('@/lib/data/hooks/useCoastalVulnerability', () => ({
  useCoastalVulnerability: vi.fn(),
}));

import { useCoastalVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';
const mockUseCoastalVulnerability = useCoastalVulnerability as ReturnType<typeof vi.fn>;

const MOCK_POLYGONS = [
  { id: 'P1', vulnerability: 0.72, urbanRatio: 0.80, mangroveCoverage: 0.10 },
  { id: 'P3', vulnerability: 0.81, urbanRatio: 0.90, mangroveCoverage: 0.10 },
  { id: 'P2', vulnerability: 0.42, urbanRatio: 0.60, mangroveCoverage: 0.30 },
];

// Sorted descending by urbanRatio: P3 (0.90) > P1 (0.80) > P2 (0.60)
const SORTED_IDS = ['P3', 'P1', 'P2'];

function renderWith(
  rankedPolygons = MOCK_POLYGONS,
  site: string | null = 'placencia',
) {
  const store = createStore();
  mockUseCoastalVulnerability.mockReturnValue({
    rankedPolygons,
    loading: false,
    error: null,
  });
  return {
    store,
    ...render(
      <Provider store={store}>
        <UrbanEncroachmentBars site={site as never} />
      </Provider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Renders horizontal bars sorted by urban ratio descending
// ---------------------------------------------------------------------------
describe('REQ-CO-016: sorted bars', () => {
  it('renders one bar row per polygon', () => {
    renderWith();
    const bars = screen.getAllByTestId(/^urban-bar-row-/);
    expect(bars.length).toBe(3);
  });

  it('sorts bars by urban ratio descending (P3 first)', () => {
    renderWith();
    const bars = screen.getAllByTestId(/^urban-bar-row-/);
    SORTED_IDS.forEach((id, i) => {
      expect(bars[i]).toHaveAttribute('data-polygon-id', id);
    });
  });
});

// ---------------------------------------------------------------------------
// 2. Hover dispatches hoveredPolygonAtom
// ---------------------------------------------------------------------------
describe('REQ-CO-016: hover dispatches hoveredPolygonAtom', () => {
  it('mouseenter on a bar row sets hoveredPolygonAtom', () => {
    const { store } = renderWith();
    const firstBar = screen.getByTestId('urban-bar-row-1');
    fireEvent.mouseEnter(firstBar);
    const hovered = store.get(hoveredPolygonAtom);
    expect(hovered).not.toBeNull();
    expect(hovered!.featureId).toBe('P3');
    expect(hovered!.layerId).toBe('coastal-polygons');
  });

  it('mouseleave on a bar row clears hoveredPolygonAtom', () => {
    const { store } = renderWith();
    const firstBar = screen.getByTestId('urban-bar-row-1');
    fireEvent.mouseEnter(firstBar);
    fireEvent.mouseLeave(firstBar);
    expect(store.get(hoveredPolygonAtom)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Click dispatches selectedPolygonAtom
// ---------------------------------------------------------------------------
describe('REQ-CO-016: click dispatches selectedPolygonAtom', () => {
  it('clicking a bar row sets selectedPolygonAtom', () => {
    const { store } = renderWith();
    const secondBar = screen.getByTestId('urban-bar-row-2');
    fireEvent.click(secondBar);
    const selected = store.get(selectedPolygonAtom);
    expect(selected).not.toBeNull();
    expect(selected!.featureId).toBe('P1');
    expect(selected!.layerId).toBe('coastal-polygons');
  });
});

// ---------------------------------------------------------------------------
// 4. Selected polygon has accent highlight
// ---------------------------------------------------------------------------
describe('REQ-CO-016: selected polygon highlight', () => {
  it('selected bar row has data-selected="true"', () => {
    const { store } = renderWith();
    store.set(selectedPolygonAtom, { layerId: 'coastal-polygons', featureId: 'P1' });

    // Re-render isn't automatic from store.set in this test — click instead
    fireEvent.click(screen.getByTestId('urban-bar-row-2'));

    const selectedBar = screen.getByTestId('urban-bar-row-2');
    expect(selectedBar).toHaveAttribute('data-selected', 'true');
  });

  it('non-selected bars do not have data-selected="true"', () => {
    renderWith();
    fireEvent.click(screen.getByTestId('urban-bar-row-1'));

    const otherBar = screen.getByTestId('urban-bar-row-2');
    expect(otherBar).not.toHaveAttribute('data-selected', 'true');
  });
});
