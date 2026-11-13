import { describe, it, expect } from 'vitest';
import {
  featureIdFromProps,
  pickToHit,
  ghostCollection,
} from '@/components/app-shell/MapDrawController';
import type { InFlightShape } from '@/atoms';

describe('REQ-MC-005: MapDrawController pure helpers', () => {
  describe('featureIdFromProps', () => {
    it('resolves the marine/coastal/watershed id fields in priority order', () => {
      expect(featureIdFromProps({ MIMES_ID: 7, Polygon_ID: 3 })).toBe('7');
      expect(featureIdFromProps({ Polygon_ID: 3 })).toBe('3');
      expect(featureIdFromProps({ GRID_ID: 'G9' })).toBe('G9');
      expect(featureIdFromProps({ Name: 'Reef A' })).toBe('Reef A');
    });
    it('strips a trailing .0 from numeric-as-string ids', () => {
      expect(featureIdFromProps({ Polygon_ID: '12.0' })).toBe('12');
    });
    it('returns null when no known id field is present', () => {
      expect(featureIdFromProps({ foo: 'bar' })).toBeNull();
      expect(featureIdFromProps({ Polygon_ID: '' })).toBeNull();
    });
  });

  describe('pickToHit', () => {
    const lngLat: [number, number] = [-88.4, 16.5];
    it('builds a FeatureHit from a deck PickingInfo', () => {
      const hit = pickToHit(
        { layer: { id: 'marine-x' }, object: { properties: { MIMES_ID: 5, NbS_Score: 0.4 } }, index: 2 },
        lngLat,
      );
      expect(hit).toEqual({
        layerId: 'marine-x',
        featureId: '5',
        properties: { MIMES_ID: 5, NbS_Score: 0.4 },
        lngLat,
      });
    });
    it('falls back to the picking index when no id field exists', () => {
      const hit = pickToHit(
        { layer: { id: 'L' }, object: { properties: { foo: 1 } }, index: 9 },
        lngLat,
      );
      expect(hit?.featureId).toBe(9);
    });
    it('returns null when the pick has no layer or object', () => {
      expect(pickToHit({ layer: null, object: { properties: {} }, index: 0 }, lngLat)).toBeNull();
      expect(pickToHit({ layer: { id: 'L' }, object: null, index: 0 }, lngLat)).toBeNull();
    });
  });

  describe('ghostCollection', () => {
    it('renders an in-flight area as vertex points + a closed polygon once >= 3 verts', () => {
      const area: InFlightShape = {
        mode: 'area',
        points: [
          [-88.4, 16.5],
          [-88.3, 16.5],
          [-88.3, 16.6],
        ],
      };
      const fc = ghostCollection(area, null);
      const polys = fc.features.filter((f) => f.geometry.type === 'Polygon');
      const pts = fc.features.filter((f) => f.geometry.type === 'Point');
      expect(pts).toHaveLength(3);
      expect(polys).toHaveLength(1);
    });
    it('renders an in-flight transect as 2 points + a line', () => {
      const transect: InFlightShape = {
        mode: 'transect',
        points: [
          [-88.4, 16.5],
          [-88.3, 16.55],
        ],
      };
      const fc = ghostCollection(transect, null);
      expect(fc.features.filter((f) => f.geometry.type === 'Point')).toHaveLength(2);
      expect(fc.features.filter((f) => f.geometry.type === 'LineString')).toHaveLength(1);
    });
    it('includes both the committed and in-flight shapes when both are present', () => {
      const committed: InFlightShape = { mode: 'point', points: [[-88.4, 16.5]] };
      const inFlight: InFlightShape = { mode: 'point', points: [[-88.3, 16.6]] };
      const fc = ghostCollection(inFlight, committed);
      expect(fc.features.filter((f) => f.geometry.type === 'Point')).toHaveLength(2);
    });
    it('returns an empty collection when there is nothing to draw', () => {
      const fc = ghostCollection(null, null);
      expect(fc.type).toBe('FeatureCollection');
      expect(fc.features).toHaveLength(0);
    });
  });
});
