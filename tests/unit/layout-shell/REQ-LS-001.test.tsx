import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { AppShell } from '@/components/app-shell/AppShell';
import { FeaturesProvider } from '@/components/app-shell/context/FeaturesProvider';
import { useFeatures } from '@/components/app-shell/hooks/useFeatures';
import type { FeatureManifest } from '@/features/_types';
import { FEATURES } from '@/features';

describe('REQ-LS-001 — AppShell scaffold + Features Context', () => {
  it('FEATURES aggregator exports a readonly array', () => {
    expect(Array.isArray(FEATURES)).toBe(true);
    // Was empty in Phase 1 (layout-shell only). After MA-001 + WS-001, Marine
    // and Watershed manifests are registered. After CO-001, Coastal is added.
    // After SC-001, SC-002, SC-003: Marine + Watershed + Coastal + Scenarios = 4
    expect(FEATURES.length).toBe(4);
  });

  it('useFeatures defaults to FEATURES when no provider override', () => {
    function Probe() {
      const f = useFeatures();
      return <span data-testid="count">{f.length}</span>;
    }
    render(<Probe />);
    expect(screen.getByTestId('count')).toHaveTextContent(String(FEATURES.length));
  });

  it('FeaturesProvider can inject test fixtures', () => {
    function Probe() {
      const f = useFeatures();
      return <span data-testid="ids">{f.map((m) => m.id).join(',')}</span>;
    }
    const fixture: FeatureManifest = { id: 'marine', label: 'Marine', icon: null };
    render(
      <FeaturesProvider value={[fixture]}>
        <Probe />
      </FeaturesProvider>,
    );
    expect(screen.getByTestId('ids')).toHaveTextContent('marine');
  });

  it('AppShell renders DesktopShell at >768px (jsdom default)', () => {
    render(
      <Provider store={createStore()}>
        <FeaturesProvider value={[]}>
          <AppShell><span data-testid="children">CHILD</span></AppShell>
        </FeaturesProvider>
      </Provider>,
    );
    expect(screen.getByTestId('children')).toHaveTextContent('CHILD');
    expect(screen.getByTestId('app-shell')).toHaveAttribute('data-shell', 'desktop');
  });
});
