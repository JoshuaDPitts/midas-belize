import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { sidebarPanelAtom } from '@/atoms';
import { SidebarRail } from '@/components/app-shell/SidebarRail';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import type { FeatureManifest } from '@/features/_types';

function renderWith(features: FeatureManifest[] = [], ui: React.ReactNode = <SidebarRail />) {
  const store = createStore();
  return {
    store,
    ...render(
      <Provider store={store}>
        <FeaturesProvider value={features}>{ui}</FeaturesProvider>
      </Provider>,
    ),
  };
}

describe('REQ-LS-003 — SidebarRail', () => {
  it('shows Layers + Inspect always (empty FEATURES → 2 icons)', () => {
    renderWith([]);
    expect(screen.getByTestId('rail-icon-layers')).toBeInTheDocument();
    expect(screen.getByTestId('rail-icon-inspect')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-icon-scenarios')).toBeNull();
    expect(screen.queryByTestId('rail-icon-domain')).toBeNull();
  });

  it('shows Scenarios when at least one manifest registers scenariosContent', () => {
    const M = () => null;
    renderWith([{ id: 'm', label: 'M', icon: null, scenariosContent: M }]);
    expect(screen.getByTestId('rail-icon-scenarios')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-icon-domain')).toBeNull();
  });

  it('shows Domain when at least one manifest registers domainContent', () => {
    const M = () => null;
    renderWith([{ id: 'm', label: 'M', icon: null, domainContent: { sublabel: 'M', component: M } }]);
    expect(screen.getByTestId('rail-icon-domain')).toBeInTheDocument();
    expect(screen.queryByTestId('rail-icon-scenarios')).toBeNull();
  });

  it('clicking an icon writes sidebarPanelAtom', async () => {
    const user = userEvent.setup();
    const { store } = renderWith([]);
    await user.click(screen.getByTestId('rail-icon-inspect'));
    expect(store.get(sidebarPanelAtom)).toBe('inspect');
  });

  it('re-clicking the active icon collapses (sets atom to null)', async () => {
    const user = userEvent.setup();
    const { store } = renderWith([]);
    store.set(sidebarPanelAtom, 'layers');
    await user.click(screen.getByTestId('rail-icon-layers'));
    expect(store.get(sidebarPanelAtom)).toBeNull();
  });

  it('marks the active icon with data-active', async () => {
    const { store } = renderWith([]);
    store.set(sidebarPanelAtom, 'inspect');
    // Atom mutation outside an event handler is flushed asynchronously in
    // React 18+ — use findBy* to await the re-render. (Same pattern as LS-002.)
    expect(await screen.findByTestId('rail-icon-inspect')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('rail-icon-layers')).toHaveAttribute('data-active', 'false');
  });
});
