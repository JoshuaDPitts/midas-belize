import '@testing-library/jest-dom/vitest';

/* Node 25 ships a stub localStorage/sessionStorage on globalThis whose
   getItem/setItem are not callable — it shadows jsdom's working ones.
   Install Map-backed implementations BEFORE any module that touches
   storage at import time (e.g. jotai's atomWithStorage with getOnInit:true)
   gets evaluated. Per-test setup files can still replace these to start
   from a clean slate. */
function installMapStorage(target: 'localStorage' | 'sessionStorage') {
  const map = new Map<string, string>();
  const storage: Storage = {
    get length() { return map.size; },
    clear() { map.clear(); },
    getItem(k) { return map.has(k) ? map.get(k)! : null; },
    key(i) { return [...map.keys()][i] ?? null; },
    removeItem(k) { map.delete(k); },
    setItem(k, v) { map.set(k, String(v)); },
  };
  Object.defineProperty(globalThis, target, { value: storage, configurable: true });
  if (typeof window !== 'undefined') {
    Object.defineProperty(window, target, { value: storage, configurable: true });
  }
}

installMapStorage('localStorage');
installMapStorage('sessionStorage');
