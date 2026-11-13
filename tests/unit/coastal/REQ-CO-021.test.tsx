/**
 * REQ-CO-021: ScenarioImpactCards — delta metric cards vs BaseCase
 *
 * Tests:
 * 1. Renders 3 metric cards: "Wave Attenuation", "Erosion Rate", "Ecosystem Services"
 * 2. Positive delta values are colored coral/red (degradation), negative colored green (improvement)
 * 3. Missing data shows placeholder text (e.g., "—")
 * 4. Per-polygon breakdown shown when selectedPolygonAtom is set
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  activeScenarioAtom,
  coastalResolutionAtom,
  selectedPolygonAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import type { ScenarioId } from '@/features/scenarios/matrix';
import { ScenarioImpactCards } from '@/features/coastal/domain/ScenarioImpactCards';

// ---------------------------------------------------------------------------
// Mock useCoastalScenarioImpact
// ---------------------------------------------------------------------------
vi.mock('@/lib/data/hooks/useCoastalScenarioImpact', () => ({
  useCoastalScenarioImpact: vi.fn(),
}));

import { useCoastalScenarioImpact } from '@/lib/data/hooks/useCoastalScenarioImpact';
const mockHook = useCoastalScenarioImpact as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Helper — build delta maps
// ---------------------------------------------------------------------------
function makeMaps(
  wave: Record<string, number>,
  erosion: Record<string, number>,
  services: Record<string, number>,
) {
  return {
    waveDeltas: new Map(Object.entries(wave)),
    erosionDeltas: new Map(Object.entries(erosion)),
    servicesDeltas: new Map(Object.entries(services)),
    loading: false,
  };
}

function renderWith(options: {
  scenario?: ScenarioId | null;
  selectedPolygon?: SelectedPolygonRef | null;
  hookResult?: ReturnType<typeof makeMaps> | null;
  site?: string | null;
} = {}) {
  const {
    scenario = 'G' as ScenarioId,
    selectedPolygon = null,
    hookResult = makeMaps({ P1: -0.5, P2: 0.3 }, { P1: 0.2, P2: -0.1 }, { P1: -0.4, P2: 0.6 }),
    site = 'placencia',
  } = options;

  const store = createStore();
  store.set(activeScenarioAtom, scenario);
  if (selectedPolygon) store.set(selectedPolygonAtom, selectedPolygon);

  if (hookResult === null) {
    mockHook.mockReturnValue({
      waveDeltas: new Map(),
      erosionDeltas: new Map(),
      servicesDeltas: new Map(),
      loading: false,
    });
  } else {
    mockHook.mockReturnValue(hookResult);
  }

  return {
    store,
    ...render(
      <Provider store={store}>
        <ScenarioImpactCards site={site as never} />
      </Provider>,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Renders 3 metric cards
// ---------------------------------------------------------------------------
describe('REQ-CO-021: three metric cards', () => {
  it('renders a "Wave Attenuation" card', () => {
    renderWith();
    expect(screen.getByText(/wave attenuation/i)).toBeInTheDocument();
  });

  it('renders an "Erosion Rate" card', () => {
    renderWith();
    expect(screen.getByText(/erosion rate/i)).toBeInTheDocument();
  });

  it('renders an "Ecosystem Services" card', () => {
    renderWith();
    expect(screen.getByText(/ecosystem services/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Delta color coding — positive = degradation (coral), negative = improvement (green)
// ---------------------------------------------------------------------------
describe('REQ-CO-021: delta color coding', () => {
  it('site-aggregate positive delta has degradation data-attribute', () => {
    // P1 wave = -0.5, P2 wave = 0.3 → average = -0.1 (negative = improvement)
    // P1 erosion = 0.2, P2 erosion = -0.1 → average = 0.05 (positive = degradation)
    renderWith();
    const erosionCard = screen.getByTestId('impact-card-erosion');
    // The delta element inside should have data-direction="degradation"
    const deltaEl = erosionCard.querySelector('[data-direction]');
    expect(deltaEl).toHaveAttribute('data-direction', 'degradation');
  });

  it('site-aggregate negative delta has improvement data-attribute', () => {
    // P1 wave = -0.5, P2 wave = 0.3 → average = -0.1 (negative = improvement)
    renderWith();
    const waveCard = screen.getByTestId('impact-card-wave');
    const deltaEl = waveCard.querySelector('[data-direction]');
    expect(deltaEl).toHaveAttribute('data-direction', 'improvement');
  });
});

// ---------------------------------------------------------------------------
// 3. Missing data shows placeholder
// ---------------------------------------------------------------------------
describe('REQ-CO-021: missing data placeholder', () => {
  it('shows no-scenario placeholder when activeScenarioAtom is null', () => {
    renderWith({ scenario: null });
    expect(screen.getByTestId('impact-cards-placeholder')).toBeInTheDocument();
  });

  it('shows "—" when delta maps are empty', () => {
    renderWith({
      hookResult: makeMaps({}, {}, {}),
    });
    // All three cards should show "—" placeholder values
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// 4. Per-polygon breakdown when selectedPolygonAtom is set
// ---------------------------------------------------------------------------
describe('REQ-CO-021: per-polygon breakdown', () => {
  it('shows polygon-specific delta when a polygon is selected', () => {
    renderWith({
      selectedPolygon: { layerId: 'coastal-polygons', featureId: 'P1' },
    });
    // P1 wave delta = -0.5
    const waveCard = screen.getByTestId('impact-card-wave');
    expect(waveCard).toHaveTextContent('P1');
  });

  it('shows site-aggregate label when no polygon selected', () => {
    renderWith({ selectedPolygon: null });
    expect(screen.getByTestId('impact-cards-aggregate-label')).toBeInTheDocument();
  });
});
