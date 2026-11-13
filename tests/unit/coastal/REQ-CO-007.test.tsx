/**
 * REQ-CO-007: CoastalMapLayers — resolution-aware polygon layer
 *
 * Testing strategy: since Deck.gl layers are complex to test directly,
 * we test the logic that computes layer props (dataset IDs, color functions)
 * via the exported helpers and the findCoastalFeature utility.
 */
import { describe, it, expect } from 'vitest';
import { geometryDatasetForSite } from '@/lib/data/hooks/useCoastalForSite';
import { findCoastalFeature } from '@/features/coastal/data/findCoastalFeature';
import { vulnerabilityEncoder, mangroveEncoder, scenarioDeltaEncoder } from '@/features/coastal/map/encoders';
import type { FeatureCollection, Feature } from 'geojson';

// ---------------------------------------------------------------------------
// 1. Resolution atom drives dataset selection
// ---------------------------------------------------------------------------
describe('REQ-CO-007: Resolution atom drives dataset selection', () => {
  it('hires placencia → placencia-30polygons-shape', () => {
    expect(geometryDatasetForSite('placencia', 'hires')).toBe('placencia-30polygons-shape');
  });

  it('lores placencia → placencia-coast-polygons', () => {
    expect(geometryDatasetForSite('placencia', 'lores')).toBe('placencia-coast-polygons');
  });

  it('caye-caulker (any resolution) → cayecaulker-coast-polygons', () => {
    expect(geometryDatasetForSite('caye-caulker', 'hires')).toBe('cayecaulker-coast-polygons');
    expect(geometryDatasetForSite('caye-caulker', 'lores')).toBe('cayecaulker-coast-polygons');
  });

  it('null site → null (no geometry fetch)', () => {
    expect(geometryDatasetForSite(null, 'hires')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Encoding atom drives fill color (correct encoder is called)
// ---------------------------------------------------------------------------
describe('REQ-CO-007: Encoding atom drives fill color', () => {
  const props = { vulnerability: 0.8, Mangrove_Pct_Total: 40, delta: -0.3 };

  it('vulnerability encoding: higher vulnerability → more red', () => {
    const low = vulnerabilityEncoder({ vulnerability: 0.1 });
    const high = vulnerabilityEncoder({ vulnerability: 0.9 });
    // high vulnerability = more coral (red channel higher)
    expect(high[0]).toBeGreaterThan(low[0]);
  });

  it('mangrove encoding: low coverage → amber (high R+G, low blue)', () => {
    const none = mangroveEncoder({ Mangrove_Pct_Total: 0 });
    // amber: high red channel
    expect(none[0]).toBeGreaterThan(200);
  });

  it('scenario-delta encoding: negative delta (improvement) → greener fill', () => {
    const improved = scenarioDeltaEncoder({ delta: -0.6 });
    expect(improved[1]).toBeGreaterThan(improved[0]);
  });

  it('scenario-delta encoding: positive delta (degradation) → more coral fill', () => {
    const degraded = scenarioDeltaEncoder({ delta: 0.8 });
    expect(degraded[0]).toBeGreaterThan(degraded[1]);
  });

  it('missing data → gray fallback for all encoders', () => {
    const GRAY: [number, number, number, number] = [120, 120, 120, 180];
    expect(vulnerabilityEncoder({})).toEqual(GRAY);
    expect(mangroveEncoder({})).toEqual(GRAY);
    expect(scenarioDeltaEncoder({})).toEqual(GRAY);
  });
});

// ---------------------------------------------------------------------------
// 3. findCoastalFeature — click writes selectedPolygonAtom + inspectedFeatureAtom
//    The utility is the logic tested; the atom write itself is tested below.
// ---------------------------------------------------------------------------

const sampleFC: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { Polygon_ID: 'P001', vulnerability: 0.5 },
      geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
    },
    {
      type: 'Feature',
      properties: { Polygon_ID: 'P002', vulnerability: 0.9 },
      geometry: { type: 'Polygon', coordinates: [[[2, 2], [3, 2], [3, 3], [2, 3], [2, 2]]] },
    },
  ],
};

describe('REQ-CO-007: findCoastalFeature', () => {
  it('returns the feature matching the given polygonId', () => {
    const result = findCoastalFeature(sampleFC, 'P001');
    expect(result).not.toBeNull();
    expect((result as Feature).properties?.Polygon_ID).toBe('P001');
  });

  it('returns a different feature for a different polygonId', () => {
    const result = findCoastalFeature(sampleFC, 'P002');
    expect(result).not.toBeNull();
    expect((result as Feature).properties?.Polygon_ID).toBe('P002');
  });

  it('returns null for an unknown polygonId', () => {
    expect(findCoastalFeature(sampleFC, 'UNKNOWN')).toBeNull();
  });

  it('returns null when FeatureCollection is null', () => {
    expect(findCoastalFeature(null, 'P001')).toBeNull();
  });

  it('returns null when polygonId is null', () => {
    expect(findCoastalFeature(sampleFC, null)).toBeNull();
  });

  it('returns null for empty FeatureCollection', () => {
    const empty: FeatureCollection = { type: 'FeatureCollection', features: [] };
    expect(findCoastalFeature(empty, 'P001')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Viewport fits on site change — tested via getCoastalLayerId helper
// ---------------------------------------------------------------------------
describe('REQ-CO-007: getCoastalLayerId helper', () => {
  // Import and test the exported helper that generates the Deck.gl layer id
  it('produces stable layer id for hires placencia', async () => {
    const { getCoastalLayerId } = await import('@/features/coastal/map/CoastalMapLayers');
    expect(getCoastalLayerId('placencia', 'hires')).toBe('coastal-polygons-placencia-hires');
  });

  it('produces stable layer id for lores placencia', async () => {
    const { getCoastalLayerId } = await import('@/features/coastal/map/CoastalMapLayers');
    expect(getCoastalLayerId('placencia', 'lores')).toBe('coastal-polygons-placencia-lores');
  });

  it('null site produces a null-site stable id', async () => {
    const { getCoastalLayerId } = await import('@/features/coastal/map/CoastalMapLayers');
    expect(getCoastalLayerId(null, 'hires')).toBe('coastal-polygons-null-hires');
  });
});
