import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeFeatureAtom } from '@/atoms';
import { DomainTab } from '@/components/app-shell/panels/DomainTab';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import { MapArea } from '@/components/app-shell/MapArea';
import type { FeatureManifest } from '@/features/_types';

// Lightweight mocks so we don't pull MapLibre into the unit test environment.
vi.mock('@/lib/map', async () => {
  const React = await import('react');
  return {
    MapView: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'mock-mapview' }, children),
  };
});

// MapArea renders the app-shell MapChrome overlay (basemap/zoom/coords/export),
// whose subtree pulls map-engine hooks not present in the minimal mock above.
// This test exercises MapArea's overlay-filtering logic, so stub MapChrome out.
vi.mock('@/components/app-shell/MapChrome', () => ({ MapChrome: () => null }));

function makeManifest(opts: { id: string; sublabel?: string; overlayId?: string }): FeatureManifest {
  const Overlay = () =>
    (
      <div data-testid={`overlay-${opts.overlayId ?? opts.id}`}>{opts.id} overlay</div>
    );
  const Content = () => <div data-testid={`domain-${opts.id}`}>{opts.id} content</div>;
  const manifest: FeatureManifest = {
    id: opts.id,
    label: opts.id,
    icon: null,
    mapOverlays: [Overlay],
  };
  if (opts.sublabel) manifest.domainContent = { sublabel: opts.sublabel, component: Content };
  return manifest;
}

describe('WS-043 forward-port: activeFeatureAtom coupling', () => {
  it('DomainTab defaults to the first contributing manifest when activeFeatureAtom is null', () => {
    // WS-043 final: the atom is the source of truth, but stays null on
    // mount (no extra useEffect write). Local rendering falls back to the
    // first contributor so the UI looks the same to the user; the atom
    // gets a value only on tab click or external setter.
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed' });
    const store = createStore();
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2]}>
          <DomainTab />
        </FeaturesProvider>
      </Provider>,
    );
    // Tab still rendered correctly (marine selected by default).
    expect(screen.getByRole('tab', { name: 'Marine' }).getAttribute('aria-selected')).toBe('true');
    // Atom stays null — no implicit mount-time write.
    expect(store.get(activeFeatureAtom)).toBeNull();
  });

  it('DomainTab reacts to external activeFeatureAtom changes (WS-044 cross-vertical bridge)', () => {
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed' });
    const store = createStore();
    store.set(activeFeatureAtom, 'watershed');
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2]}>
          <DomainTab />
        </FeaturesProvider>
      </Provider>,
    );
    // External setter chose 'watershed' before mount → watershed tab active.
    expect(screen.getByRole('tab', { name: 'Watershed' }).getAttribute('aria-selected')).toBe('true');
  });

  it('DomainTab updates activeFeatureAtom on sub-tab click', async () => {
    const user = userEvent.setup();
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed' });
    const store = createStore();
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2]}>
          <DomainTab />
        </FeaturesProvider>
      </Provider>,
    );
    await user.click(screen.getByRole('tab', { name: 'Watershed' }));
    expect(store.get(activeFeatureAtom)).toBe('watershed');
  });

  it('MapArea renders only the active vertical mapOverlays', () => {
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine', overlayId: 'marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed', overlayId: 'watershed' });
    const store = createStore();
    store.set(activeFeatureAtom, 'watershed');
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2]}>
          <MapArea />
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.queryByTestId('overlay-marine')).toBeNull();
    expect(screen.getByTestId('overlay-watershed')).toBeInTheDocument();
  });

  it('MapArea defaults to the first contributor when activeFeatureAtom is null', () => {
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine', overlayId: 'marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed', overlayId: 'watershed' });
    const store = createStore();
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2]}>
          <MapArea />
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('overlay-marine')).toBeInTheDocument();
    expect(screen.queryByTestId('overlay-watershed')).toBeNull();
  });

  it('MapArea always renders overlays from manifests without domainContent', () => {
    const m1 = makeManifest({ id: 'marine', sublabel: 'Marine', overlayId: 'marine' });
    const m2 = makeManifest({ id: 'watershed', sublabel: 'Watershed', overlayId: 'watershed' });
    // m3 contributes no domainContent, so its overlays are immune from filtering.
    const m3: FeatureManifest = {
      id: 'baselayer',
      label: 'Baselayer',
      icon: null,
      mapOverlays: [() => <div data-testid="overlay-baselayer">always-on</div>],
    };
    const store = createStore();
    store.set(activeFeatureAtom, 'watershed');
    render(
      <Provider store={store}>
        <FeaturesProvider value={[m1, m2, m3]}>
          <MapArea />
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('overlay-baselayer')).toBeInTheDocument();
    expect(screen.getByTestId('overlay-watershed')).toBeInTheDocument();
    expect(screen.queryByTestId('overlay-marine')).toBeNull();
  });
});
