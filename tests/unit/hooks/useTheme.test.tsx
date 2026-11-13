import type { ReactNode } from 'react';
import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { useTheme } from '@/hooks/useTheme';

/* Wraps renderHook in a fresh Jotai store so themeAtom state doesn't
   leak between tests (the default module-level atom is global). */
function renderUseTheme() {
  const store = createStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useTheme(), { wrapper });
}

/* Node 25 ships a stub localStorage on globalThis that shadows jsdom's.
   Replace it with a Map-backed implementation that satisfies the hook. */
function installStorage() {
  const store = new Map<string, string>();
  const storage: Storage = {
    get length() { return store.size; },
    clear() { store.clear(); },
    getItem(k) { return store.has(k) ? store.get(k)! : null; },
    key(i) { return [...store.keys()][i] ?? null; },
    removeItem(k) { store.delete(k); },
    setItem(k, v) { store.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  Object.defineProperty(window, 'localStorage', { value: storage, configurable: true });
}

function installMatchMedia() {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}

describe('useTheme — hydrate-before-write ordering', () => {
  beforeAll(() => {
    installStorage();
    installMatchMedia();
  });

  beforeEach(() => {
    localStorage.removeItem('midas-theme');
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    cleanup();
  });

  it('hydrates from midas-theme=dark without stomping localStorage back to light', () => {
    localStorage.setItem('midas-theme', '"dark"');
    renderUseTheme();
    expect(localStorage.getItem('midas-theme')).toBe('"dark"');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('first visit (no saved preference) defaults to light regardless of OS theme', () => {
    /* The hook must not read prefers-color-scheme; light is the explicit default. */
    window.matchMedia = (query: string) =>
      ({
        matches: query.includes('dark'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList;
    renderUseTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    /* atomWithStorage does not write the default to storage on first read —
       it only writes on a mutation. So with no saved preference, the key
       stays absent. */
    expect(localStorage.getItem('midas-theme')).toBeNull();
  });

  it('hydrates from midas-theme=light and keeps light', () => {
    localStorage.setItem('midas-theme', '"light"');
    renderUseTheme();
    expect(localStorage.getItem('midas-theme')).toBe('"light"');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('toggleTheme flips and persists', () => {
    localStorage.setItem('midas-theme', '"dark"');
    const { result } = renderUseTheme();
    expect(result.current.theme).toBe('dark');
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(localStorage.getItem('midas-theme')).toBe('"light"');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setTheme writes DOM attribute and localStorage', () => {
    const { result } = renderUseTheme();
    act(() => result.current.setTheme('dark'));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem('midas-theme')).toBe('"dark"');
  });
});
