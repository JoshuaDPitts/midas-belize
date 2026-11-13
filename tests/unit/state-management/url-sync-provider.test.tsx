import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore, useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import {
  activeSiteAtom,
  activeScenarioAtom,
  visibleLayersAtom,
} from '@/atoms';
import { useUrlSyncProvider } from '@/atoms/url-sync';

function Probe() {
  useUrlSyncProvider();
  const [site, setSite] = useAtom(activeSiteAtom);
  const [scenario, setScenario] = useAtom(activeScenarioAtom);
  const [layers, setLayers] = useAtom(visibleLayersAtom);
  return (
    <>
      <span data-testid="site">{site ?? ''}</span>
      <span data-testid="scenario">{scenario ?? ''}</span>
      <span data-testid="layers">{layers.join(',')}</span>
      <button
        onClick={() => {
          setSite('placencia');
          setScenario('basecase');
          setLayers(['marine-coral']);
        }}
      >
        Set
      </button>
    </>
  );
}

describe('REQ-SM-013 — useUrlSyncProvider composes all 5 hooks', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('site / scenario / layers all hydrate from URL on mount', () => {
    const store = createStore();
    render(
      <Provider store={store}>
        <NuqsTestingAdapter searchParams="?site=placencia&scenario=basecase&layers=marine-coral">
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    expect(screen.getByTestId('site')).toHaveTextContent('placencia');
    expect(screen.getByTestId('scenario')).toHaveTextContent('basecase');
    expect(screen.getByTestId('layers')).toHaveTextContent('marine-coral');
  });

  it('atom changes propagate to URL across all wired keys', async () => {
    const user = userEvent.setup();
    const store = createStore();
    const captured: { params: URLSearchParams | null } = { params: null };
    render(
      <Provider store={store}>
        <NuqsTestingAdapter
          onUrlUpdate={(e) => {
            captured.params = e.searchParams;
          }}
        >
          <Probe />
        </NuqsTestingAdapter>
      </Provider>,
    );
    await user.click(screen.getByRole('button'));
    // The orchestrator wires all syncs; the last URL update should reflect
    // the cumulative state. (Each individual sync writes once; we only assert
    // that the final captured URL has all 3 keys.)
    expect(captured.params?.get('site')).toBe('placencia');
    expect(captured.params?.get('scenario')).toBe('basecase');
    expect(captured.params?.get('layers')).toBe('marine-coral');
  });
});
