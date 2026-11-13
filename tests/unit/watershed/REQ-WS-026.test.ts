import { describe, it, expect } from 'vitest';
import { buildRFactorLayer, OVERLAY_LAYER_ID, DEFAULT_OPACITY } from '@/features/watershed/map/RFactorRasterOverlay';

describe('REQ-WS-026: buildRFactorLayer (RFactorRasterOverlay)', () => {
  it('returns null when month is null', () => {
    expect(
      buildRFactorLayer({
        month: null,
        rasterUrl: 'whatever',
        bounds: [-89, 15, -87, 18],
      }),
    ).toBeNull();
  });

  it('returns null when rasterUrl is null', () => {
    expect(
      buildRFactorLayer({
        month: 5,
        rasterUrl: null,
        bounds: [-89, 15, -87, 18],
      }),
    ).toBeNull();
  });

  it('returns null when bounds are missing', () => {
    expect(
      buildRFactorLayer({
        month: 5,
        rasterUrl: '/api/data/rfactor-may',
        bounds: null,
      }),
    ).toBeNull();
  });

  it('current behaviour: returns null even with full inputs (COG/PNG infra gap)', () => {
    // Documented: until a tile / PNG endpoint lands, the builder warns
    // once and returns null. When PNG infra lands, swap this expectation
    // to `expect(...).not.toBeNull()` and assert layer.id === OVERLAY_LAYER_ID.
    const result = buildRFactorLayer({
      month: 7,
      rasterUrl: '/api/data/rfactor-jul',
      bounds: [-89.25, 15.85, -87.5, 18.5],
    });
    expect(result).toBeNull();
  });

  it('exports a stable layer id + default opacity', () => {
    expect(OVERLAY_LAYER_ID).toBe('watershed-rfactor-month-overlay');
    expect(DEFAULT_OPACITY).toBeCloseTo(0.55, 5);
  });
});
