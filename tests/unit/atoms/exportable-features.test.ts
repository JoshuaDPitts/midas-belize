// tests/unit/atoms/exportable-features.test.ts
import { describe, it, expect } from 'vitest';
import { createStore } from 'jotai';
import { exportableFeaturesAtom } from '@/atoms';

describe('REQ-MC-006: exportableFeaturesAtom', () => {
  it('defaults to null and accepts an ExportableSource', () => {
    const store = createStore();
    expect(store.get(exportableFeaturesAtom)).toBeNull();
    store.set(exportableFeaturesAtom, { layerId: 'x', label: 'X', features: [] });
    expect(store.get(exportableFeaturesAtom)?.layerId).toBe('x');
  });
});
