import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { sidebarPanelAtom } from '@/atoms';
import { SidebarPanel } from '@/components/app-shell/SidebarPanel';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';

function renderWith(ui = <SidebarPanel />) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <FeaturesProvider value={[]}>{ui}</FeaturesProvider>
      </Provider>,
    ),
  };
}

describe('REQ-LS-004 — SidebarPanel container', () => {
  it('renders nothing when sidebarPanelAtom is null', () => {
    renderWith();
    expect(screen.queryByTestId('appshell-sidebar-panel')).toBeNull();
  });

  it('renders the Layers tab when atom is "layers"', async () => {
    const { store } = renderWith();
    store.set(sidebarPanelAtom, 'layers');
    expect(await screen.findByTestId('appshell-sidebar-panel')).toBeInTheDocument();
    expect(screen.getByTestId('panel-layers')).toBeInTheDocument();
  });

  it('renders the Inspect tab when atom is "inspect"', async () => {
    const { store } = renderWith();
    store.set(sidebarPanelAtom, 'inspect');
    expect(await screen.findByTestId('panel-inspect')).toBeInTheDocument();
  });

  it('close button sets atom to null', async () => {
    const user = userEvent.setup();
    const { store } = renderWith();
    store.set(sidebarPanelAtom, 'layers');
    await user.click(await screen.findByTestId('appshell-panel-close'));
    expect(store.get(sidebarPanelAtom)).toBeNull();
  });
});
