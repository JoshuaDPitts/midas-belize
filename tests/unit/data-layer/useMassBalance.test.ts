import { describe, it, expect } from 'vitest';
import type { Feature, Polygon } from 'geojson';
import {
  computeSources,
  computeFates,
  DEFAULT_DELIVERY_RATIO,
  DEFAULT_FATES_SPLIT,
  type MassBalanceSource,
} from '@/lib/data/hooks/useMassBalance';

const ring = (lng: number, lat: number, side = 0.1) => [
  [lng, lat],
  [lng + side, lat],
  [lng + side, lat + side],
  [lng, lat + side],
  [lng, lat],
];

function poly(name: string, lng: number, lat: number, side = 0.1): Feature<Polygon> {
  return {
    type: 'Feature',
    properties: { Name: name },
    geometry: { type: 'Polygon', coordinates: [ring(lng, lat, side)] },
  };
}

describe('REQ-WS-040: useMassBalance aggregators', () => {
  describe('computeSources', () => {
    it('returns yield list sorted by tPerYr descending', () => {
      const features = [
        poly('Small', -88.4, 16.5, 0.02),
        poly('Big', -88.3, 16.5, 0.2),
      ];
      const joined = {
        rusle: [
          { Name: 'Small', A_t_ha_yr: 3.0 },
          { Name: 'Big', A_t_ha_yr: 1.0 },
        ],
      };
      const sources = computeSources({ features, joinedRusle: joined });
      // Big polygon (~480 ha) at A=1.0 ≫ Small (~4.8 ha) at A=3.0.
      expect(sources.length).toBe(2);
      expect(sources[0].name).toBe('Big');
      expect(sources[1].name).toBe('Small');
      expect(sources[0].tPerYr).toBeGreaterThan(sources[1].tPerYr);
    });

    it('skips polygons missing A_t_ha_yr', () => {
      const features = [poly('NoData', -88.4, 16.5)];
      const joined = { rusle: [] };
      expect(computeSources({ features, joinedRusle: joined })).toEqual([]);
    });

    it('skips polygons with A_t_ha_yr <= 0', () => {
      const features = [poly('Zero', -88.4, 16.5), poly('Neg', -88.5, 16.5)];
      const joined = {
        rusle: [
          { Name: 'Zero', A_t_ha_yr: 0 },
          { Name: 'Neg', A_t_ha_yr: -1 },
        ],
      };
      expect(computeSources({ features, joinedRusle: joined })).toEqual([]);
    });

    it('uses MIMES_ID polygonKey fallthrough', () => {
      const f: Feature<Polygon> = {
        type: 'Feature',
        properties: { MIMES_ID: 17 },
        geometry: { type: 'Polygon', coordinates: [ring(-88.4, 16.5)] },
      };
      const joined = { rusle: [{ MIMES_ID: 17, A_t_ha_yr: 1.0 }] };
      const out = computeSources({ features: [f], joinedRusle: joined });
      expect(out).toHaveLength(1);
      expect(out[0].polygonId).toBe('17');
    });

    it('returns empty when no joined rusle data', () => {
      const features = [poly('X', -88.4, 16.5)];
      expect(computeSources({ features, joinedRusle: null })).toEqual([]);
    });
  });

  describe('computeFates', () => {
    const sources: MassBalanceSource[] = [
      { polygonId: '1', name: 'A', tPerYr: 60 },
      { polygonId: '2', name: 'B', tPerYr: 40 },
    ];

    it('applies default 0.4 delivery ratio to total', () => {
      const { total, transport } = computeFates(sources);
      expect(total).toBe(100);
      expect(transport).toBeCloseTo(40, 6);
    });

    it('splits delivered sediment 60/30/10 by default', () => {
      const { fates } = computeFates(sources);
      expect(fates.coastal).toBeCloseTo(24, 6);
      expect(fates.nearshore).toBeCloseTo(12, 6);
      expect(fates.offshore).toBeCloseTo(4, 6);
      expect(fates.coastal + fates.nearshore + fates.offshore).toBeCloseTo(40, 6);
    });

    it('accepts a custom delivery ratio', () => {
      const { transport } = computeFates(sources, 0.8);
      expect(transport).toBe(80);
    });

    it('accepts a custom fates split', () => {
      const { fates } = computeFates(sources, 1, {
        coastal: 0.5,
        nearshore: 0.25,
        offshore: 0.25,
      });
      expect(fates.coastal).toBe(50);
      expect(fates.nearshore).toBe(25);
      expect(fates.offshore).toBe(25);
    });

    it('returns zero total + fates for empty source list', () => {
      const { total, transport, fates } = computeFates([]);
      expect(total).toBe(0);
      expect(transport).toBe(0);
      expect(fates.coastal).toBe(0);
    });

    it('exports the default constants', () => {
      expect(DEFAULT_DELIVERY_RATIO).toBe(0.4);
      expect(DEFAULT_FATES_SPLIT.coastal + DEFAULT_FATES_SPLIT.nearshore + DEFAULT_FATES_SPLIT.offshore).toBeCloseTo(1, 6);
    });
  });
});
