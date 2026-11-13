import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { activeSiteAtom, visibleLayersAtom, layerOpacityAtom } from '@/atoms';
import { LayersTab } from '@/components/app-shell/panels/LayersTab';
import { SWRConfig } from 'swr';

const fixture = {
  layers: [
    { id: 'marine-coral',  layer: 'marine-coral',  title: 'Coral Cover', family: 'marine',  scope: 'site' },
    { id: 'erosion-risk',  layer: 'erosion-risk',  title: 'Erosion Risk', family: 'coastal', scope: 'site' },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(fixture), {
    headers: { 'Content-Type': 'application/json' },
  })) as typeof fetch;
});

function renderTab() {
  const store = createStore();
  store.set(activeSiteAtom, 'placencia');
  return {
    store,
    ...render(
      <SWRConfig value={{ provider: () => new Map() }}>
        <Provider store={store}>
          <LayersTab />
        </Provider>
      </SWRConfig>,
    ),
  };
}

describe('REQ-LS-006 — LayersTab basic', () => {
  it('renders one row per layer from useLayersForSite', async () => {
    renderTab();
    expect(await screen.findByTestId('layer-row-marine-coral')).toBeInTheDocument();
    expect(screen.getByTestId('layer-row-erosion-risk')).toBeInTheDocument();
  });

  it('checking visibility writes the id into visibleLayersAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderTab();
    await user.click(await screen.findByTestId('layer-vis-marine-coral'));
    expect(store.get(visibleLayersAtom)).toContain('marine-coral');
  });

  it('unchecking visibility removes the id', async () => {
    const user = userEvent.setup();
    const { store } = renderTab();
    store.set(visibleLayersAtom, ['marine-coral']);
    await user.click(await screen.findByTestId('layer-vis-marine-coral'));
    expect(store.get(visibleLayersAtom)).not.toContain('marine-coral');
  });

  it('changing opacity writes layerOpacityAtom for that id', async () => {
    const { store } = renderTab();
    const slider = await screen.findByTestId('layer-opacity-marine-coral') as HTMLInputElement;
    slider.value = '0.5';
    slider.dispatchEvent(new Event('input', { bubbles: true }));
    expect(store.get(layerOpacityAtom)['marine-coral']).toBe(0.5);
  });
});
