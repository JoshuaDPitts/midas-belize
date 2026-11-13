import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  activeSiteAtom,
  visibleLayersAtom,
  timeStepAtom,
  timeRangeAtom,
  urlSnapshotAtom,
} from '@/atoms';
import { useCopyShareLink } from '@/atoms/use-copy-share-link';

describe('REQ-SM-016 — urlSnapshotAtom + useCopyShareLink', () => {
  it('urlSnapshotAtom encodes the current state as a query string', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(timeRangeAtom, ['2026-01-01', '2026-02-01']);
    store.set(timeStepAtom, 1);
    store.set(visibleLayersAtom, ['marine-coral']);
    const url = store.get(urlSnapshotAtom);
    expect(url).toContain('site=placencia');
    expect(url).toContain('t=2026-02');
    expect(url).toContain('layers=marine-coral');
  });

  it('useCopyShareLink writes the URL to navigator.clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    const { result } = renderHook(() => useCopyShareLink(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    await act(async () => {
      await result.current.copy();
    });
    expect(writeText).toHaveBeenCalled();
    const arg = writeText.mock.calls[0][0] as string;
    expect(arg).toContain('site=placencia');
  });

  it('useCopyShareLink returns true on success and exposes copied=true briefly', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
    const store = createStore();
    const { result } = renderHook(() => useCopyShareLink(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    let success = false;
    await act(async () => {
      success = await result.current.copy();
    });
    expect(success).toBe(true);
    expect(result.current.copied).toBe(true);
  });

  it('useCopyShareLink returns false when clipboard rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const store = createStore();
    const { result } = renderHook(() => useCopyShareLink(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    let success = true;
    await act(async () => {
      success = await result.current.copy();
    });
    expect(success).toBe(false);
  });
});
