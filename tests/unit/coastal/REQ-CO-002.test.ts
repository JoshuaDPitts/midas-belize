import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import {
  coastalResolutionAtom,
  coastalEncodingAtom,
  coastalAutoEncodingAtom,
} from '@/atoms';

describe('REQ-CO-002: Coastal atoms', () => {
  it('coastalResolutionAtom defaults to hires', () => {
    const store = createStore();
    expect(store.get(coastalResolutionAtom)).toBe('hires');
  });
  it('coastalEncodingAtom defaults to vulnerability', () => {
    const store = createStore();
    expect(store.get(coastalEncodingAtom)).toBe('vulnerability');
  });
  it('coastalAutoEncodingAtom defaults to true', () => {
    const store = createStore();
    expect(store.get(coastalAutoEncodingAtom)).toBe(true);
  });
});
