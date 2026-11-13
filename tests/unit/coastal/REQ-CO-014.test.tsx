/**
 * REQ-CO-014: VulnerabilityRanking — Section 1 ranked list
 *
 * Tests:
 * 1. Renders ranked list sorted by V descending
 * 2. Each row shows polygon name, V score, dual bars (urban amber + mangrove green)
 * 3. Clicking a row dispatches selectedPolygonAtom
 * 4. Resolution toggle present in section header (Hi-res / Lo-res pills)
 * 5. Empty state when no polygons provided
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { selectedPolygonAtom, coastalResolutionAtom } from '@/atoms';
import { VulnerabilityRanking } from '@/features/coastal/domain/VulnerabilityRanking';

// ---------------------------------------------------------------------------
// Mock useCoastalVulnerability
// ---------------------------------------------------------------------------
vi.mock('@/lib/data/hooks/useCoastalVulnerability', () => ({
  useCoastalVulnerability: vi.fn(),
}));

import { useCoastalVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';
const mockUseCoastalVulnerability = useCoastalVulnerability as ReturnType<typeof vi.fn>;

const MOCK_POLYGONS = [
  { id: 'P3', vulnerability: 0.81, urbanRatio: 0.9, mangroveCoverage: 0.1 },
  { id: 'P1', vulnerability: 0.72, urbanRatio: 0.8, mangroveCoverage: 0.1 },
  { id: 'P2', vulnerability: 0.42, urbanRatio: 0.6, mangroveCoverage: 0.3 },
];

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
        <VulnerabilityRanking site={site as never} />
      </Provider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Renders ranked list sorted by V descending
// ---------------------------------------------------------------------------
describe('REQ-CO-014: sorted rank list', () => {
  it('renders rows in descending V order', () => {
    renderWith();
    const rows = screen.getAllByTestId(/^vuln-rank-row-/);
    expect(rows.length).toBe(3);
    // First row should have P3 (highest V=0.81)
    expect(rows[0]).toHaveTextContent('P3');
    // Second should be P1 (V=0.72)
    expect(rows[1]).toHaveTextContent('P1');
    // Third should be P2 (V=0.42)
    expect(rows[2]).toHaveTextContent('P2');
  });
});

// ---------------------------------------------------------------------------
// 2. Each row shows polygon name, V score, dual bars
// ---------------------------------------------------------------------------
describe('REQ-CO-014: row content', () => {
  it('each row shows polygon name and V score to 2dp', () => {
    renderWith();
    // P3 row should show "0.81"
    const rows = screen.getAllByTestId(/^vuln-rank-row-/);
    expect(rows[0]).toHaveTextContent('P3');
    expect(rows[0]).toHaveTextContent('0.81');
    expect(rows[1]).toHaveTextContent('P1');
    expect(rows[1]).toHaveTextContent('0.72');
  });

  it('each row has two bar elements (urban amber + mangrove green)', () => {
    renderWith();
    const urbanBars = screen.getAllByRole('meter', { name: /urban/i });
    const mangroveBars = screen.getAllByRole('meter', { name: /mangrove/i });
    expect(urbanBars.length).toBe(3);
    expect(mangroveBars.length).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// 3. Clicking a row dispatches selectedPolygonAtom
// ---------------------------------------------------------------------------
describe('REQ-CO-014: row click selection', () => {
  it('clicking a row sets selectedPolygonAtom with the polygon id', () => {
    const { store } = renderWith();
    const row = screen.getByTestId('vuln-rank-row-1');
    const button = row.querySelector('button')!;
    fireEvent.click(button);
    const selected = store.get(selectedPolygonAtom);
    expect(selected).not.toBeNull();
    expect(selected!.featureId).toBe('P3');
    expect(selected!.layerId).toBe('coastal-polygons');
  });
});

// ---------------------------------------------------------------------------
// 4. Resolution toggle present in section header
// ---------------------------------------------------------------------------
describe('REQ-CO-014: resolution toggle', () => {
  it('renders Hi-res and Lo-res pill buttons', () => {
    renderWith();
    expect(screen.getByRole('button', { name: /hi.?res/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /lo.?res/i })).toBeInTheDocument();
  });

  it('clicking Lo-res sets coastalResolutionAtom to lores', () => {
    const { store } = renderWith();
    const loresBtn = screen.getByRole('button', { name: /lo.?res/i });
    fireEvent.click(loresBtn);
    expect(store.get(coastalResolutionAtom)).toBe('lores');
  });

  it('clicking Hi-res sets coastalResolutionAtom to hires', () => {
    const { store } = renderWith();
    // first set to lores
    store.set(coastalResolutionAtom, 'lores');
    const hiresBtn = screen.getByRole('button', { name: /hi.?res/i });
    fireEvent.click(hiresBtn);
    expect(store.get(coastalResolutionAtom)).toBe('hires');
  });
});

// ---------------------------------------------------------------------------
// 5. Empty state when no polygons
// ---------------------------------------------------------------------------
describe('REQ-CO-014: empty state', () => {
  it('shows empty state message when rankedPolygons is empty', () => {
    renderWith([]);
    expect(screen.getByTestId('vuln-ranking-empty')).toBeInTheDocument();
  });

  it('does not render rank rows when empty', () => {
    renderWith([]);
    expect(screen.queryAllByTestId(/^vuln-rank-row-/).length).toBe(0);
  });
});
