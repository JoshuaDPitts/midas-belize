import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { SWRConfig } from 'swr';
import { activeSiteAtom, visibleLayersAtom } from '@/atoms';
import { LayersTab } from '@/components/app-shell/panels/LayersTab';

const fixture = {
  layers: [
    { id: 'a', layer: 'a', title: 'Alpha',   family: 'marine',  scope: 'site' },
    { id: 'b', layer: 'b', title: 'Bravo',   family: 'coastal', scope: 'site' },
    { id: 'c', layer: 'c', title: 'Charlie', family: 'marine',  scope: 'site' },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async () => new Response(JSON.stringify(fixture), { headers: { 'Content-Type': 'application/json' } })) as typeof fetch;
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

describe('REQ-LS-007 — LayersTab search + group + reorder', () => {
  it('search filters rows by case-insensitive title substring', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByTestId('layer-row-a');
    await user.type(screen.getByTestId('layer-search'), 'brav');
    expect(screen.getByTestId('layer-row-b')).toBeInTheDocument();
    expect(screen.queryByTestId('layer-row-a')).toBeNull();
  });

  it('group-by-family pill groups rows by family', async () => {
    const user = userEvent.setup();
    renderTab();
    await screen.findByTestId('layer-row-a');
    await user.click(screen.getByTestId('layer-group-toggle'));
    const marineGroup = screen.getByTestId('layer-group-marine');
    const coastalGroup = screen.getByTestId('layer-group-coastal');
    expect(within(marineGroup).getByTestId('layer-row-a')).toBeInTheDocument();
    expect(within(marineGroup).getByTestId('layer-row-c')).toBeInTheDocument();
    expect(within(coastalGroup).getByTestId('layer-row-b')).toBeInTheDocument();
  });

  it('reorder via drag-drop writes a new visibleLayersAtom array', async () => {
    const { store } = renderTab();
    store.set(visibleLayersAtom, ['a', 'b', 'c']);
    await screen.findByTestId('layer-row-a');
    const rowA = screen.getByTestId('layer-row-a');
    const rowC = screen.getByTestId('layer-row-c');
    // jsdom does not implement DataTransfer; build a stand-in shared between
    // dragstart/dragover/drop so the layer id round-trips via setData/getData.
    const store_: Record<string, string> = {};
    const dt = {
      data: store_,
      effectAllowed: 'move',
      dropEffect: 'move',
      setData(type: string, val: string) { store_[type] = val; },
      getData(type: string) { return store_[type] ?? ''; },
    };
    const fire = (target: Element, type: string) => {
      const ev = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(ev, 'dataTransfer', { value: dt });
      target.dispatchEvent(ev);
    };
    fire(rowA, 'dragstart');
    fire(rowC, 'dragover');
    fire(rowC, 'drop');
    // 'a' moves to after 'c' → ['b', 'c', 'a']
    expect(store.get(visibleLayersAtom)).toEqual(['b', 'c', 'a']);
  });
});
