import { describe, it, expect } from 'vitest';
import { FEATURES } from '@/features';
import type { FeatureManifest } from '@/features/_types';

describe('Marine — FeatureManifest aggregation', () => {
  it('FEATURES exports Marine manifest', () => {
    expect(FEATURES.some((f: FeatureManifest) => f.id === 'marine')).toBe(true);
  });
});
