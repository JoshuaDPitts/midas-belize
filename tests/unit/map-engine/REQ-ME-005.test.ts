import { describe, it, expect } from 'vitest';
import {
  validateMaplibreLayer,
  SUPPORTED_ML_TYPES,
} from '@/lib/map/layers/maplibreLayers';
import type { MaplibreLayer } from '@/lib/map/layers/types';

describe('REQ-ME-005: MapLibre native layer types', () => {
  it('exposes exactly the 9 supported native types', () => {
    expect([...SUPPORTED_ML_TYPES].sort()).toEqual([
      'background',
      'circle',
      'fill',
      'fill-extrusion',
      'heatmap',
      'hillshade',
      'line',
      'raster',
      'symbol',
    ]);
  });

  it('accepts a well-formed fill layer', () => {
    const cfg: MaplibreLayer = {
      id: 'a',
      type: 'fill',
      source: {
        kind: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      style: { color: '#000' },
    };
    expect(() => validateMaplibreLayer(cfg)).not.toThrow();
  });

  it('accepts each of the 9 supported types when otherwise well-formed', () => {
    const base = {
      source: {
        kind: 'geojson' as const,
        data: { type: 'FeatureCollection' as const, features: [] },
      },
      style: {},
    };
    for (const type of SUPPORTED_ML_TYPES) {
      expect(() =>
        validateMaplibreLayer({ id: `layer-${type}`, type, ...base } as MaplibreLayer),
      ).not.toThrow();
    }
  });

  it('rejects a layer missing id', () => {
    const bad = {
      type: 'fill',
      source: {
        kind: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      style: {},
    } as unknown as MaplibreLayer;
    expect(() => validateMaplibreLayer(bad)).toThrow(/id/);
  });

  it('rejects a layer with an unsupported type', () => {
    const bad = {
      id: 'x',
      type: 'unknown-type',
      source: {
        kind: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      },
      style: {},
    } as unknown as MaplibreLayer;
    expect(() => validateMaplibreLayer(bad)).toThrow(/unsupported/i);
  });

  it('rejects a layer missing source', () => {
    const bad = {
      id: 'y',
      type: 'fill',
      style: { color: '#000' },
    } as unknown as MaplibreLayer;
    expect(() => validateMaplibreLayer(bad)).toThrow(/source/);
  });
});
