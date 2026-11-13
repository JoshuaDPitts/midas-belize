// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { themeAtom, basemapAtom, sidebarPanelAtom, marineEncodingAtom } from '@/atoms';

// Regression: SM-003 introduced atomWithStorage with `getOnInit: true`
// which evaluates the storage backend at module-load. Without the
// SSR-safe shim, this crashes Next.js server rendering with
// "TypeError: localStorage.getItem is not a function" because
// localStorage is undefined when there's no window.
describe('REQ-SM-003 — atoms construct safely under SSR (no window)', () => {
  it('confirms the test runs in a node environment without window', () => {
    expect(typeof window).toBe('undefined');
  });

  it('themeAtom reads as default without throwing', () => {
    const store = createStore();
    expect(() => store.get(themeAtom)).not.toThrow();
    expect(store.get(themeAtom)).toBe('light');
  });

  it('basemapAtom reads as default without throwing', () => {
    const store = createStore();
    expect(() => store.get(basemapAtom)).not.toThrow();
    expect(store.get(basemapAtom)).toBe('light');
  });

  it('sidebarPanelAtom reads as default without throwing', () => {
    const store = createStore();
    expect(() => store.get(sidebarPanelAtom)).not.toThrow();
    expect(store.get(sidebarPanelAtom)).toBeNull();
  });

  // Regression: marineEncodingAtom intentionally omits getOnInit:true so SSR
  // and the client first paint both resolve to the default ('nbs'), avoiding
  // a React hydration mismatch on EncoderPicker + MapLegend.
  it('marineEncodingAtom reads as default without throwing', () => {
    const store = createStore();
    expect(() => store.get(marineEncodingAtom)).not.toThrow();
    expect(store.get(marineEncodingAtom)).toBe('nbs');
  });
});
