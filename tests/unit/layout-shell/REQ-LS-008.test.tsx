import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom } from '@/atoms';
import { LayersTab } from '@/components/app-shell/panels/LayersTab';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import type { FeatureManifest } from '@/features/_types';

const fixture = {
  layers: [
    {
      id: 'a', layer: 'a', title: 'Alpha', family: 'marine', scope: 'site',
      provenance: { source: 'GFW', license: 'CC-BY 4.0', citation: 'GFW 2024', source_url: null, upstream_paths: [] },
      temporal_extent: { start: '2024-01-01', end: '2025-12-01' },
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(fixture), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
});

function renderTab(features: FeatureManifest[] = []) {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <Provider store={store}>
        <FeaturesProvider value={features}>
          <LayersTab />
        </FeaturesProvider>
      </Provider>
    </SWRConfig>,
  );
}

describe('REQ-LS-008 — LayersTab provenance + manifest layersRowGroup', () => {
  it('clicking the info button reveals the provenance popover', async () => {
    const user = userEvent.setup();
    renderTab();
    await user.click(await screen.findByTestId('layer-info-a'));
    expect(screen.getByTestId('layer-prov-a')).toBeInTheDocument();
    expect(screen.getByTestId('layer-prov-a')).toHaveTextContent(/GFW/);
    expect(screen.getByTestId('layer-prov-a')).toHaveTextContent(/CC-BY 4.0/);
  });

  it('renders manifest.layersRowGroup sections after platform rows', async () => {
    const m: FeatureManifest = {
      id: 'marine',
      label: 'Marine',
      icon: null,
      layersRowGroup: () => [
        { id: 'marine-extras', label: 'Marine extras', layerIds: ['a'], order: 30 },
      ],
    };
    renderTab([m]);
    expect(await screen.findByTestId('feature-group-marine')).toBeInTheDocument();
    expect(screen.getByTestId('layer-group-spec-marine-extras')).toBeInTheDocument();
    expect(screen.getByText('Marine')).toBeInTheDocument();
    expect(screen.getByText('Marine extras')).toBeInTheDocument();
    expect(screen.getAllByTestId('layer-row-a')).toHaveLength(2);
  });
});
