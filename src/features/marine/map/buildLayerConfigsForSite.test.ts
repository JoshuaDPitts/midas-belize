import { describe, it, expect } from 'vitest';
import { buildLayerConfigsForSite } from './buildLayerConfigsForSite';

describe('buildLayerConfigsForSite', () => {
  it('returns the marine polygon geometry for laughing-bird', () => {
    const configs = buildLayerConfigsForSite('laughing-bird');
    expect(configs).toEqual([
      { datasetId: 'laughing-bird-marine-polygons', family: 'marine-polygons' },
    ]);
  });

  it('still returns 3 joined layers for placencia', () => {
    const configs = buildLayerConfigsForSite('placencia');
    expect(configs.map((c) => c.datasetId)).toEqual([
      'placencia-marine-nbs-scores',
      'placencia-coast-nbs-scores',
      'placencia-30polygons-nbs-scores',
    ]);
  });

  it('returns [] for null', () => {
    expect(buildLayerConfigsForSite(null)).toEqual([]);
  });
});
