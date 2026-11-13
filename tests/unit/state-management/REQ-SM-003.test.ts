import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from 'jotai';
import { themeAtom, basemapAtom, sidebarPanelAtom } from '@/atoms';

// Map-backed localStorage / sessionStorage shims live in vitest.setup.ts —
// just clear them between tests for isolation.
describe('REQ-SM-003 — atomWithStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('themeAtom round-trips through midas-theme localStorage', () => {
    const store = createStore();
    store.set(themeAtom, 'dark');
    expect(localStorage.getItem('midas-theme')).toBe('"dark"');
  });

  it('themeAtom hydrates from existing midas-theme localStorage on read', () => {
    localStorage.setItem('midas-theme', '"dark"');
    const store = createStore();
    /* atomWithStorage hydrates from storage via onMount — only fires on
       first subscription. A bare store.get() returns the module-load value. */
    const unsub = store.sub(themeAtom, () => {});
    expect(store.get(themeAtom)).toBe('dark');
    unsub();
  });

  it('basemapAtom round-trips through midas-basemap localStorage', () => {
    const store = createStore();
    store.set(basemapAtom, 'satellite');
    expect(localStorage.getItem('midas-basemap')).toBe('"satellite"');
  });

  it('sidebarPanelAtom round-trips through midas-sidebar-panel sessionStorage', () => {
    const store = createStore();
    store.set(sidebarPanelAtom, 'layers');
    expect(sessionStorage.getItem('midas-sidebar-panel')).toBe('"layers"');
    expect(localStorage.getItem('midas-sidebar-panel')).toBeNull();
  });
});
