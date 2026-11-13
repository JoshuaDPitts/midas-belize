import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { visibleLayersAtom } from '@/atoms';
import { _layerCatalogCacheAtom } from '@/atoms/cache-bridge';
import { useHasTimeAwareLayer } from '@/components/app-shell/hooks/useHasTimeAwareLayer';
import { BottomBar } from '@/components/app-shell/BottomBar';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';

function Probe() {
  const v = useHasTimeAwareLayer();
  return <span data-testid="has-time">{String(v)}</span>;
}

const layerWithTime = {
  id: 'b', layer: 'b', title: 'B', family: 'm', scope: 'site', tags: [], bbox: null,
  temporal_extent: { start: '2024-01-01', end: '2025-12-01' },
  data_url: '', current_version: null,
  provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] },
} as never;

const layerNoTime = {
  id: 'a', layer: 'a', title: 'A', family: 'm', scope: 'site', tags: [], bbox: null,
  temporal_extent: null,
  data_url: '', current_version: null,
  provenance: { source: '', source_url: null, license: '', citation: '', upstream_paths: [] },
} as never;

describe('REQ-LS-011 — BottomBar conditional', () => {
  it('useHasTimeAwareLayer returns false when no visible layer has temporal_extent', () => {
    const store = createStore();
    store.set(_layerCatalogCacheAtom, [layerNoTime]);
    store.set(visibleLayersAtom, ['a']);
    render(<Provider store={store}><Probe /></Provider>);
    expect(screen.getByTestId('has-time')).toHaveTextContent('false');
  });

  it('useHasTimeAwareLayer returns true when a visible layer has temporal_extent', () => {
    const store = createStore();
    store.set(_layerCatalogCacheAtom, [layerWithTime]);
    store.set(visibleLayersAtom, ['b']);
    render(<Provider store={store}><Probe /></Provider>);
    expect(screen.getByTestId('has-time')).toHaveTextContent('true');
  });

  it('BottomBar renders nothing when no time-aware layer is active', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <FeaturesProvider value={[]}>
          <BottomBar />
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.queryByTestId('appshell-bottom-bar')).toBeNull();
  });

  it('BottomBar renders attribution when a time-aware layer is active', () => {
    const store = createStore();
    store.set(_layerCatalogCacheAtom, [layerWithTime]);
    store.set(visibleLayersAtom, ['b']);
    render(
      <Provider store={store}>
        <FeaturesProvider value={[]}>
          <BottomBar />
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('appshell-bottom-bar')).toBeInTheDocument();
    expect(screen.getByTestId('appshell-attribution')).toBeInTheDocument();
  });
});
