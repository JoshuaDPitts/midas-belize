import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import {
  activeSiteAtom,
  activeScenarioAtom,
  visibleLayersAtom,
  timeStepAtom,
  isDefaultViewAtom,
} from '@/atoms';
import { useResetToDefaults } from '@/atoms/use-reset-to-defaults';

describe('REQ-SM-017 — isDefaultViewAtom + useResetToDefaults', () => {
  it('is true on a fresh store', () => {
    const store = createStore();
    expect(store.get(isDefaultViewAtom)).toBe(true);
  });

  it('flips false once any URL-shareable atom moves', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    expect(store.get(isDefaultViewAtom)).toBe(false);
  });

  it('flips false on scenario change', () => {
    const store = createStore();
    store.set(activeScenarioAtom, 'basecase');
    expect(store.get(isDefaultViewAtom)).toBe(false);
  });

  it('flips false on layer toggle', () => {
    const store = createStore();
    store.set(visibleLayersAtom, ['marine-coral']);
    expect(store.get(isDefaultViewAtom)).toBe(false);
  });

  it('flips false on time scrub', () => {
    const store = createStore();
    store.set(timeStepAtom, 5);
    expect(store.get(isDefaultViewAtom)).toBe(false);
  });

  it('useResetToDefaults clears all URL-shareable atoms back to defaults', () => {
    const store = createStore();
    store.set(activeSiteAtom, 'placencia');
    store.set(activeScenarioAtom, 'basecase');
    store.set(visibleLayersAtom, ['marine-coral']);
    store.set(timeStepAtom, 5);

    const { result } = renderHook(() => useResetToDefaults(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });
    act(() => result.current());

    expect(store.get(activeSiteAtom)).toBeNull();
    expect(store.get(activeScenarioAtom)).toBeNull();
    expect(store.get(visibleLayersAtom)).toEqual([]);
    expect(store.get(timeStepAtom)).toBe(0);
    expect(store.get(isDefaultViewAtom)).toBe(true);
  });
});
