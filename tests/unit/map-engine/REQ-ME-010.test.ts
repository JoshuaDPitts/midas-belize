// tests/unit/map-engine/REQ-ME-010.test.ts
// ME-010 — legend engine. Pure legendFromStyle + edge cases.
import { describe, it, expect } from 'vitest';
import { legendFromStyle, rgbToCss } from '@/lib/map/legends/legendFromStyle';
import type { LayerConfig } from '@/lib/map/layers/types';

describe('REQ-ME-010: rgbToCss', () => {
  it('emits rgb() for 3-tuples', () => {
    expect(rgbToCss([10, 20, 30])).toBe('rgb(10, 20, 30)');
  });

  it('normalizes RGBA 0-255 alpha to 0-1', () => {
    expect(rgbToCss([10, 20, 30, 128])).toMatch(/^rgba\(10, 20, 30, 0\.502\)$/);
  });

  it('keeps RGBA alpha already in 0-1 space', () => {
    expect(rgbToCss([10, 20, 30, 0.25])).toMatch(/^rgba\(10, 20, 30, 0\.250\)$/);
  });
});

describe('REQ-ME-010: legendFromStyle — MapLibre variants', () => {
  it('graduated fill → graduated legend', () => {
    const cfg: LayerConfig = {
      id: 'a',
      type: 'fill',
      label: 'Area',
      unit: 'km²',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: {
        color: { kind: 'graduated', field: 'v', breaks: [10, 20], values: ['#111', '#222', '#333'] },
      },
    };
    const out = legendFromStyle(cfg);
    expect(out).toEqual({
      kind: 'graduated',
      layerId: 'a',
      label: 'Area',
      unit: 'km²',
      breaks: [10, 20],
      colors: ['#111', '#222', '#333'],
    });
  });

  it('categorical fill → categorical legend (labels from map keys)', () => {
    const cfg: LayerConfig = {
      id: 'b',
      type: 'fill',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: {
        color: {
          kind: 'categorical',
          field: 'district',
          map: { Corozal: '#f00', Cayo: '#0f0' },
          fallback: '#999',
        },
      },
    };
    const out = legendFromStyle(cfg);
    expect(out.kind).toBe('categorical');
    if (out.kind === 'categorical') {
      expect(out.items).toEqual([
        { label: 'Corozal', color: '#f00' },
        { label: 'Cayo', color: '#0f0' },
      ]);
      expect(out.label).toBe('b');
    }
  });

  it('proportional circle → continuous legend', () => {
    const cfg: LayerConfig = {
      id: 'c',
      type: 'circle',
      label: 'Scaled',
      unit: 'units',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: {
        color: { kind: 'proportional', field: 'v', domain: [0, 100], range: ['#ffe', '#f00'] },
      },
    };
    const out = legendFromStyle(cfg);
    expect(out).toEqual({
      kind: 'continuous',
      layerId: 'c',
      label: 'Scaled',
      unit: 'units',
      colors: ['#ffe', '#f00'],
      domain: [0, 100],
    });
  });

  it('fill with constant color → none', () => {
    const cfg: LayerConfig = {
      id: 'd',
      type: 'fill',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: { color: '#0ff' },
    };
    expect(legendFromStyle(cfg).kind).toBe('none');
  });

  it('raster (no color style) → none', () => {
    const cfg: LayerConfig = {
      id: 'e',
      type: 'raster',
      source: { kind: 'raster-tile', tiles: ['https://example/{z}/{x}/{y}.png'] },
      style: { opacity: 1 },
    };
    expect(legendFromStyle(cfg).kind).toBe('none');
  });
});

describe('REQ-ME-010: legendFromStyle — Deck variants', () => {
  it('deck.hexagon with colorRange → continuous legend (no domain)', () => {
    const cfg: LayerConfig = {
      id: 'hex',
      type: 'deck.hexagon',
      label: 'AIS hours',
      unit: 'h',
      source: { kind: 'array', data: [] },
      getPosition: 'geometry.coordinates',
      style: {
        colorRange: [[0, 0, 0], [255, 255, 255]],
        radius: 5000,
      },
    };
    const out = legendFromStyle(cfg);
    expect(out.kind).toBe('continuous');
    if (out.kind === 'continuous') {
      expect(out.colors).toEqual(['rgb(0, 0, 0)', 'rgb(255, 255, 255)']);
      expect(out.domain).toBeNull();
      expect(out.label).toBe('AIS hours');
      expect(out.unit).toBe('h');
    }
  });

  it('deck.h3-hexagon with colorRange + explicit domain → continuous with numeric bounds', () => {
    const cfg: LayerConfig = {
      id: 'h3',
      type: 'deck.h3-hexagon',
      label: 'H3 density',
      source: { kind: 'array', data: [] },
      getHexagon: 'h',
      style: {
        colorRange: [[10, 10, 10], [200, 200, 200]],
        domain: [0, 50],
        extruded: false,
      },
    };
    const out = legendFromStyle(cfg);
    expect(out.kind).toBe('continuous');
    if (out.kind === 'continuous') expect(out.domain).toEqual([0, 50]);
  });

  it('deck.scenegraph (mesh, no colorRange) → none', () => {
    const cfg: LayerConfig = {
      id: 'ship',
      type: 'deck.scenegraph',
      source: { kind: 'array', data: [] },
      getPosition: 'pos',
      scenegraph: 'https://example/model.glb',
      style: { sizeScale: 1 },
    };
    expect(legendFromStyle(cfg).kind).toBe('none');
  });

  it('layerId + label fallback — uses id when label is absent', () => {
    const cfg: LayerConfig = {
      id: 'noLabel',
      type: 'fill',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: {
        color: { kind: 'graduated', field: 'v', breaks: [1], values: ['#a', '#b'] },
      },
    };
    const out = legendFromStyle(cfg);
    if (out.kind === 'graduated') expect(out.label).toBe('noLabel');
  });
});
