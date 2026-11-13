// tests/unit/atoms/effective-marine-encoding.test.ts
import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { activeSiteAtom, effectiveMarineEncodingAtom, marineEncodingAtom } from '@/atoms';

describe('effectiveMarineEncodingAtom', () => {
  it('forces biomass on laughing-bird regardless of the stored preference', () => {
    const store = createStore();
    store.set(marineEncodingAtom, 'nbs');
    store.set(activeSiteAtom, 'laughing-bird');
    expect(store.get(effectiveMarineEncodingAtom)).toBe('biomass');
  });

  it('falls back to nbs on other sites when the stored preference is biomass', () => {
    const store = createStore();
    store.set(marineEncodingAtom, 'biomass');
    store.set(activeSiteAtom, 'placencia');
    expect(store.get(effectiveMarineEncodingAtom)).toBe('nbs');
  });

  it('passes through the stored preference on other sites when it is not biomass', () => {
    const store = createStore();
    store.set(marineEncodingAtom, 'clade');
    store.set(activeSiteAtom, 'placencia');
    expect(store.get(effectiveMarineEncodingAtom)).toBe('clade');
  });
});
