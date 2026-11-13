import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore, useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { visibleLayersAtom } from '@/atoms';
import { useVisibleLayersUrlSync } from '@/atoms/url-sync';

function Probe() {
  useVisibleLayersUrlSync();
  const [layers, setLayers] = useAtom(visibleLayersAtom);
  return (
    <>
      <span data-testid="layers">{layers.join(',')}</span>
      <button onClick={() => setLayers(['marine-coral', 'erosion-risk'])}>
        Set 2
      </button>
    </>
  );
}

// Each render gets its own Jotai store so visibleLayersAtom doesn't leak
// across tests (matches SM-011's test isolation pattern).
function renderWithFreshStore(ui: React.ReactNode) {
  const store = createStore();
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('REQ-SM-012 — visibleLayers URL sync', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/');
  });

  it('writes layers= comma-joined preserving z-order on atom change', async () => {
    const user = userEvent.setup();
    const captured: {
      params: URLSearchParams | null;
      mode: string | undefined;
    } = {
      params: null,
      mode: undefined,
    };
    renderWithFreshStore(
      <NuqsTestingAdapter
        onUrlUpdate={(e) => {
          captured.params = e.searchParams;
          captured.mode = e.options.history;
        }}
      >
        <Probe />
      </NuqsTestingAdapter>,
    );
    await user.click(screen.getByRole('button'));
    expect(captured.params?.get('layers')).toBe('marine-coral,erosion-risk');
    expect(captured.mode).toBe('replace');
  });

  it('reads ?layers= into the atom on mount', () => {
    renderWithFreshStore(
      <NuqsTestingAdapter searchParams="?layers=site-boundary,marine-coral">
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('layers')).toHaveTextContent(
      'site-boundary,marine-coral',
    );
  });

  it('handles missing ?layers= as empty array on mount', () => {
    renderWithFreshStore(
      <NuqsTestingAdapter>
        <Probe />
      </NuqsTestingAdapter>,
    );
    expect(screen.getByTestId('layers')).toHaveTextContent('');
  });
});
