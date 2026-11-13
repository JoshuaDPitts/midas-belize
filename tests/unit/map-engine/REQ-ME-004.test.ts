// tests/unit/map-engine/REQ-ME-004.test.ts
import { describe, it, expect } from 'vitest';
import { interpretMaplibreStyle } from '@/lib/map/layers/styleInterpret';
import type { FillLayer, CircleLayer, LineLayer, HeatmapLayer } from '@/lib/map/layers/types';

const fill = (style: FillLayer['style']): FillLayer => ({
  id: 'x', type: 'fill', style,
  source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
});

const circle = (style: CircleLayer['style']): CircleLayer => ({
  id: 'c', type: 'circle', style,
  source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
});

const line = (style: LineLayer['style']): LineLayer => ({
  id: 'ln', type: 'line', style,
  source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
});

const heatmap = (style: HeatmapLayer['style']): HeatmapLayer => ({
  id: 'hm', type: 'heatmap', style,
  source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
});

describe('interpretMaplibreStyle — fill', () => {
  it('constant color → fill-color literal', () => {
    expect(interpretMaplibreStyle(fill({ color: '#abc' })).paint['fill-color']).toBe('#abc');
  });

  it('{ kind: constant } color → fill-color literal', () => {
    expect(interpretMaplibreStyle(fill({ color: { kind: 'constant', value: '#def' } })).paint['fill-color']).toBe('#def');
  });

  it('graduated color → MapLibre step expression', () => {
    const out = interpretMaplibreStyle(
      fill({ color: { kind: 'graduated', field: 'v', breaks: [10, 20], values: ['#a', '#b', '#c'] } }),
    );
    expect(out.paint['fill-color']).toEqual(['step', ['get', 'v'], '#a', 10, '#b', 20, '#c']);
  });

  it('categorical color → MapLibre match expression', () => {
    const out = interpretMaplibreStyle(
      fill({ color: { kind: 'categorical', field: 'cat', map: { a: '#1', b: '#2' }, fallback: '#x' } }),
    );
    expect(out.paint['fill-color']).toEqual(['match', ['get', 'cat'], 'a', '#1', 'b', '#2', '#x']);
  });

  it('proportional opacity → interpolate expression', () => {
    const out = interpretMaplibreStyle(
      fill({ opacity: { kind: 'proportional', field: 'score', domain: [0, 1], range: [0.1, 1.0] } }),
    );
    expect(out.paint['fill-opacity']).toEqual(['interpolate', ['linear'], ['get', 'score'], 0, 0.1, 1, 1.0]);
  });

  it('visibility defaults to visible', () => {
    expect(interpretMaplibreStyle(fill({})).layout['visibility']).toBe('visible');
  });

  it('visible: false → none', () => {
    const cfg = { ...fill({}), visible: false };
    expect(interpretMaplibreStyle(cfg).layout['visibility']).toBe('none');
  });
});

describe('interpretMaplibreStyle — circle', () => {
  it('constant radius → literal', () => {
    expect(interpretMaplibreStyle(circle({ radius: 8 })).paint['circle-radius']).toBe(8);
  });

  it('proportional radius → interpolate expression', () => {
    const out = interpretMaplibreStyle(
      circle({ radius: { kind: 'proportional', field: 'n', domain: [0, 100], range: [2, 20] } }),
    );
    expect(out.paint['circle-radius']).toEqual(['interpolate', ['linear'], ['get', 'n'], 0, 2, 100, 20]);
  });

  it('graduated color → step expression', () => {
    const out = interpretMaplibreStyle(
      circle({ color: { kind: 'graduated', field: 'val', breaks: [5], values: ['#low', '#high'] } }),
    );
    expect(out.paint['circle-color']).toEqual(['step', ['get', 'val'], '#low', 5, '#high']);
  });
});

describe('interpretMaplibreStyle — line', () => {
  it('constant color → fill-color literal', () => {
    expect(interpretMaplibreStyle(line({ color: '#ff0' })).paint['line-color']).toBe('#ff0');
  });

  it('categorical color → match expression', () => {
    const out = interpretMaplibreStyle(
      line({ color: { kind: 'categorical', field: 'type', map: { road: '#999', path: '#ccc' } } }),
    );
    // fallback becomes the default ('rgba(255,255,255,0.3)' for lines doesn't exist, uses the line-color default)
    expect(out.paint['line-color']).toEqual(expect.arrayContaining(['match', ['get', 'type']]));
  });

  it('dasharray passes through', () => {
    expect(interpretMaplibreStyle(line({ dasharray: [4, 2] })).paint['line-dasharray']).toEqual([4, 2]);
  });

  it('proportional width → interpolate', () => {
    const out = interpretMaplibreStyle(
      line({ width: { kind: 'proportional', field: 'w', domain: [0, 10], range: [1, 8] } }),
    );
    expect(out.paint['line-width']).toEqual(['interpolate', ['linear'], ['get', 'w'], 0, 1, 10, 8]);
  });
});

describe('interpretMaplibreStyle — heatmap', () => {
  it('colorRamp → heatmap-color interpolate expression', () => {
    const out = interpretMaplibreStyle(
      heatmap({ colorRamp: ['#blue', '#yellow', '#red'] }),
    );
    const expr = out.paint['heatmap-color'] as unknown[];
    expect(expr[0]).toBe('interpolate');
    expect(expr[1]).toEqual(['linear']);
    expect(expr[2]).toEqual(['heatmap-density']);
    // stops: 0→blue, 0.5→yellow, 1→red
    expect(expr[3]).toBe(0);
    expect(expr[4]).toBe('#blue');
    expect(expr[5]).toBeCloseTo(0.5);
    expect(expr[6]).toBe('#yellow');
    expect(expr[7]).toBe(1);
    expect(expr[8]).toBe('#red');
  });

  it('constant weight → literal', () => {
    expect(interpretMaplibreStyle(heatmap({ weight: 2 })).paint['heatmap-weight']).toBe(2);
  });

  it('graduated radius → step expression', () => {
    const out = interpretMaplibreStyle(
      heatmap({ radius: { kind: 'graduated', field: 'zoom', breaks: [8], values: [10, 20] } }),
    );
    expect(out.paint['heatmap-radius']).toEqual(['step', ['get', 'zoom'], 10, 8, 20]);
  });
});

describe('interpretMaplibreStyle — return shape', () => {
  it('returns { paint, layout, type }', () => {
    const out = interpretMaplibreStyle(fill({ color: '#abc' }));
    expect(out).toHaveProperty('paint');
    expect(out).toHaveProperty('layout');
    expect(out).toHaveProperty('type', 'fill');
  });
});
