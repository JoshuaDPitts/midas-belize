import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { Provider, createStore, useAtom } from 'jotai';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { mapViewportAtom } from '@/atoms';
import { useViewportUrlSync } from '@/atoms/url-sync';

function Probe() {
  useViewportUrlSync();
  const [, setVp] = useAtom(mapViewportAtom);
  return (
    <button
      onClick={() =>
        setVp({ center: [-88.36, 16.55], zoom: 11, bearing: 30, pitch: 45 })
      }
    >
      Pan
    </button>
  );
}

function renderWithFreshStore(
  ui: React.ReactNode,
  captured: {
    params: URLSearchParams | null;
    mode: string | undefined;
  },
) {
  const store = createStore();
  return render(
    <Provider store={store}>
      <NuqsTestingAdapter
        onUrlUpdate={(e) => {
          captured.params = e.searchParams;
          captured.mode = e.options.history;
        }}
      >
        {ui}
      </NuqsTestingAdapter>
    </Provider>,
  );
}

describe('REQ-SM-013 — viewport URL sync (throttled)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.replaceState({}, '', '/');
  });
  afterEach(() => vi.useRealTimers());

  it('does not write the URL until 300ms has elapsed', () => {
    const captured = {
      params: null as URLSearchParams | null,
      mode: undefined as string | undefined,
    };
    renderWithFreshStore(<Probe />, captured);
    act(() => screen.getByRole('button').click());
    // Throttle window: no write yet
    act(() => vi.advanceTimersByTime(150));
    expect(captured.params).toBeNull();
    // Past throttle: write fires
    act(() => vi.advanceTimersByTime(200)); // total 350ms
    expect(captured.params?.get('v')).toBe('-88.36,16.55,11,30,45');
    expect(captured.mode).toBe('replace');
  });

  it('coalesces rapid changes — only the last value is written', () => {
    const captured = {
      params: null as URLSearchParams | null,
      mode: undefined as string | undefined,
    };
    function MultiProbe() {
      useViewportUrlSync();
      const [, setVp] = useAtom(mapViewportAtom);
      return (
        <>
          <button onClick={() => setVp({ center: [-88, 16], zoom: 8, bearing: 0, pitch: 0 })}>A</button>
          <button onClick={() => setVp({ center: [-89, 17], zoom: 12, bearing: 30, pitch: 45 })}>B</button>
        </>
      );
    }
    renderWithFreshStore(<MultiProbe />, captured);
    act(() => screen.getByText('A').click());
    act(() => vi.advanceTimersByTime(100)); // throttle still pending
    act(() => screen.getByText('B').click()); // restarts the timer with new value
    act(() => vi.advanceTimersByTime(305));
    // Only B should be in the URL
    expect(captured.params?.get('v')).toBe('-89,17,12,30,45');
  });
});
