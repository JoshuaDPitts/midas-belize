import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import { ScenariosTab } from '@/components/app-shell/panels/ScenariosTab';
import { DomainTab } from '@/components/app-shell/panels/DomainTab';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import type { FeatureManifest } from '@/features/_types';

function renderTab(ui: React.ReactNode, features: FeatureManifest[] = []) {
  return render(
    <Provider store={createStore()}>
      <FeaturesProvider value={features}>{ui}</FeaturesProvider>
    </Provider>,
  );
}

describe('REQ-LS-015 — ScenariosTab + DomainTab shells', () => {
  it('ScenariosTab renders nothing when no vertical contributes', () => {
    renderTab(<ScenariosTab />, []);
    expect(screen.queryByTestId('panel-scenarios')).toBeNull();
  });

  it('ScenariosTab renders all registered scenariosContent components', () => {
    function MarineScenarios() { return <div data-testid="marine-scenarios">marine</div>; }
    function CoastalScenarios() { return <div data-testid="coastal-scenarios">coastal</div>; }
    const ms = [
      { id: 'marine',  label: 'Marine',  icon: null, scenariosContent: MarineScenarios },
      { id: 'coastal', label: 'Coastal', icon: null, scenariosContent: CoastalScenarios },
    ] satisfies FeatureManifest[];
    renderTab(<ScenariosTab />, ms);
    expect(screen.getByTestId('panel-scenarios')).toBeInTheDocument();
    expect(screen.getByTestId('marine-scenarios')).toBeInTheDocument();
    expect(screen.getByTestId('coastal-scenarios')).toBeInTheDocument();
  });

  it('DomainTab renders sub-tabs when 2+ verticals contribute domainContent', () => {
    function MarineDomain() { return <div data-testid="marine-domain">marine</div>; }
    function CoastalDomain() { return <div data-testid="coastal-domain">coastal</div>; }
    const ms = [
      { id: 'marine',  label: 'Marine',  icon: null, domainContent: { sublabel: 'Marine',  component: MarineDomain } },
      { id: 'coastal', label: 'Coastal', icon: null, domainContent: { sublabel: 'Coastal', component: CoastalDomain } },
    ] satisfies FeatureManifest[];
    renderTab(<DomainTab />, ms);
    expect(screen.getByTestId('marine-domain')).toBeInTheDocument();
    expect(screen.queryByTestId('coastal-domain')).toBeNull();
    expect(screen.getByRole('tab', { name: /Marine/ })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Coastal/ })).toBeInTheDocument();
  });

  it('DomainTab renders the single content directly (no sub-tabs) when only one vertical contributes', () => {
    function MarineDomain() { return <div data-testid="marine-domain">marine</div>; }
    const ms = [{ id: 'marine', label: 'Marine', icon: null, domainContent: { sublabel: 'Marine', component: MarineDomain } }] satisfies FeatureManifest[];
    renderTab(<DomainTab />, ms);
    expect(screen.getByTestId('marine-domain')).toBeInTheDocument();
    expect(screen.queryByRole('tab')).toBeNull();
  });

  it('DomainTab — clicking a sub-tab switches the active sub-content', async () => {
    const user = userEvent.setup();
    function MarineDomain() { return <div data-testid="marine-domain">marine</div>; }
    function CoastalDomain() { return <div data-testid="coastal-domain">coastal</div>; }
    const ms = [
      { id: 'marine',  label: 'Marine',  icon: null, domainContent: { sublabel: 'Marine',  component: MarineDomain } },
      { id: 'coastal', label: 'Coastal', icon: null, domainContent: { sublabel: 'Coastal', component: CoastalDomain } },
    ] satisfies FeatureManifest[];
    renderTab(<DomainTab />, ms);
    await user.click(screen.getByRole('tab', { name: /Coastal/ }));
    expect(screen.getByTestId('coastal-domain')).toBeInTheDocument();
    expect(screen.queryByTestId('marine-domain')).toBeNull();
  });
});
