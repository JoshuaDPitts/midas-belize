/**
 * REQ-CO-013: CoastalDomainContent — narrative scroll orchestrator
 *
 * Tests:
 * 1. Renders 3 sections with correct headings
 * 2. Each section has a sentinel <div> with correct data-encoding attribute
 * 3. Caye Caulker shows Section 1 + empty states for Sections 2 and 3
 * 4. Laughing Bird shows offshore empty state (no sections)
 * 5. IntersectionObserver callback writes coastalEncodingAtom when
 *    coastalAutoEncodingAtom is true, but NOT when false
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  activeSiteAtom,
  coastalEncodingAtom,
  coastalAutoEncodingAtom,
  type CoastalEncodingMode,
} from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { CoastalDomainContent } from '@/features/coastal/domain/CoastalDomainContent';

// ---------------------------------------------------------------------------
// Mock sub-component hooks (VulnerabilityRanking, MangroveUrbanTrend,
// UrbanEncroachmentBars use these — keep CO-013 focused on orchestration)
// ---------------------------------------------------------------------------
vi.mock('@/lib/data/hooks/useCoastalVulnerability', () => ({
  useCoastalVulnerability: vi.fn(() => ({
    rankedPolygons: [],
    loading: false,
    error: null,
  })),
}));

vi.mock('@/lib/data/hooks/useCoastalForSite', () => ({
  useCoastalForSite: vi.fn(() => ({
    geometry: null,
    joinedAttrs: null,
    loading: false,
    error: null,
  })),
  geometryDatasetForSite: vi.fn(() => null),
  joinedDatasetsForSite: vi.fn(() => null),
}));

// ---------------------------------------------------------------------------
// IntersectionObserver mock
// ---------------------------------------------------------------------------
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
const mockUnobserve = vi.fn();
let capturedCallback: IntersectionObserverCallback;

class MockIntersectionObserver {
  constructor(cb: IntersectionObserverCallback) {
    capturedCallback = cb;
  }
  observe = mockObserve;
  disconnect = mockDisconnect;
  unobserve = mockUnobserve;
}

global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderWith(site: SiteId | null = 'placencia', autoEncoding = true) {
  const store = createStore();
  store.set(activeSiteAtom, site);
  store.set(coastalAutoEncodingAtom, autoEncoding);
  return {
    store,
    ...render(
      <Provider store={store}>
        <CoastalDomainContent />
      </Provider>,
    ),
  };
}

// ---------------------------------------------------------------------------
// 1. Renders 3 sections with correct headings
// ---------------------------------------------------------------------------
describe('REQ-CO-013: section headings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders three sections with correct headings for Placencia', () => {
    renderWith('placencia');
    expect(
      screen.getByText('Where is the coast most vulnerable?'),
    ).toBeInTheDocument();
    expect(screen.getByText('How did it get this way?')).toBeInTheDocument();
    expect(screen.getByText('What can we do?')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Each section has a sentinel <div> with correct data-encoding attribute
// ---------------------------------------------------------------------------
describe('REQ-CO-013: sentinel data-encoding attributes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sentinel divs carry vulnerability, mangrove, and scenario-delta encoding values', () => {
    renderWith('placencia');
    expect(
      document.querySelector('[data-encoding="vulnerability"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-encoding="mangrove"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-encoding="scenario-delta"]'),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Caye Caulker shows Section 1 + empty states for Sections 2 and 3
// ---------------------------------------------------------------------------
describe('REQ-CO-013: Caye Caulker empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Section 1 heading for Caye Caulker', () => {
    renderWith('caye-caulker');
    expect(
      screen.getByText('Where is the coast most vulnerable?'),
    ).toBeInTheDocument();
  });

  it('renders partial-data empty state for Sections 2 and 3 in Caye Caulker', () => {
    renderWith('caye-caulker');
    // Both sections 2 and 3 should contain the partial-data notice
    const notices = screen.getAllByText(
      /coastal model data is not yet available for caye caulker/i,
    );
    expect(notices.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 4. Laughing Bird shows offshore empty state (no sections)
// ---------------------------------------------------------------------------
describe('REQ-CO-013: Laughing Bird offshore empty state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders offshore empty state for Laughing Bird Caye', () => {
    renderWith('laughing-bird');
    expect(
      screen.getByText(/laughing bird caye has no coastal zone/i),
    ).toBeInTheDocument();
  });

  it('does NOT render section headings for Laughing Bird Caye', () => {
    renderWith('laughing-bird');
    expect(
      screen.queryByText('Where is the coast most vulnerable?'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('How did it get this way?'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('What can we do?')).not.toBeInTheDocument();
  });

  it('renders a CTA button that sets activeSiteAtom to placencia', async () => {
    const { store } = renderWith('laughing-bird');
    const cta = screen.getByRole('button', { name: /view placencia coastal analysis/i });
    expect(cta).toBeInTheDocument();
    await act(async () => {
      cta.click();
    });
    expect(store.get(activeSiteAtom)).toBe('placencia');
  });
});

// ---------------------------------------------------------------------------
// 5. IntersectionObserver writes coastalEncodingAtom when auto=true, not when false
// ---------------------------------------------------------------------------
describe('REQ-CO-013: IntersectionObserver scroll-driven encoding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('writes coastalEncodingAtom when autoEncoding is true and sentinel intersects', async () => {
    const { store } = renderWith('placencia', true);

    // Find the mangrove sentinel
    const sentinel = document.querySelector(
      '[data-encoding="mangrove"]',
    ) as HTMLElement;
    expect(sentinel).toBeTruthy();

    // Simulate intersection
    await act(async () => {
      capturedCallback(
        [{ isIntersecting: true, target: sentinel } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver,
      );
    });

    expect(store.get(coastalEncodingAtom)).toBe('mangrove');
  });

  it('does NOT write coastalEncodingAtom when autoEncoding is false', async () => {
    const { store } = renderWith('placencia', false);
    // Start with vulnerability encoding
    store.set(coastalEncodingAtom, 'vulnerability');

    const sentinel = document.querySelector(
      '[data-encoding="scenario-delta"]',
    ) as HTMLElement;
    expect(sentinel).toBeTruthy();

    await act(async () => {
      capturedCallback(
        [{ isIntersecting: true, target: sentinel } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver,
      );
    });

    // Encoding should NOT have changed
    expect(store.get(coastalEncodingAtom)).toBe('vulnerability');
  });

  it('ignores non-intersecting entries', async () => {
    const { store } = renderWith('placencia', true);
    store.set(coastalEncodingAtom, 'vulnerability');

    const sentinel = document.querySelector(
      '[data-encoding="mangrove"]',
    ) as HTMLElement;

    await act(async () => {
      capturedCallback(
        [{ isIntersecting: false, target: sentinel } as unknown as IntersectionObserverEntry],
        {} as unknown as IntersectionObserver,
      );
    });

    expect(store.get(coastalEncodingAtom)).toBe('vulnerability');
  });
});
