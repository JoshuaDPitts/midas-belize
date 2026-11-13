// tests/unit/map-engine/REQ-ME-004.property.test.ts
import { describe, it, expect } from 'vitest';
import { interpretMaplibreStyle } from '@/lib/map/layers/styleInterpret';
import type { FillLayer } from '@/lib/map/layers/types';

function randFill(seed: number): FillLayer {
  const c = `#${(seed & 0xffffff).toString(16).padStart(6, '0')}`;
  return {
    id: `l${seed}`, type: 'fill',
    source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    style: { color: c, opacity: (seed % 10) / 10 },
  };
}

describe('interpretMaplibreStyle — properties', () => {
  it('is deterministic over 200 random inputs', () => {
    for (let s = 1; s <= 200; s++) {
      const cfg = randFill(s);
      expect(interpretMaplibreStyle(cfg)).toEqual(interpretMaplibreStyle(cfg));
    }
  });

  it('is idempotent on a clone', () => {
    for (let s = 1; s <= 50; s++) {
      const cfg = randFill(s);
      const clone = JSON.parse(JSON.stringify(cfg)) as FillLayer;
      expect(interpretMaplibreStyle(cfg)).toEqual(interpretMaplibreStyle(clone));
    }
  });

  it('does not mutate input', () => {
    const cfg = randFill(42);
    const snap = JSON.parse(JSON.stringify(cfg)) as FillLayer;
    interpretMaplibreStyle(cfg);
    expect(cfg).toEqual(snap);
  });

  it('calling twice on same object produces equal output', () => {
    for (let s = 100; s <= 150; s++) {
      const cfg = randFill(s);
      const a = interpretMaplibreStyle(cfg);
      const b = interpretMaplibreStyle(cfg);
      expect(a).toEqual(b);
    }
  });

  it('graduated style is deterministic', () => {
    const cfg: FillLayer = {
      id: 'grad', type: 'fill',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: { color: { kind: 'graduated', field: 'v', breaks: [10, 20, 30], values: ['#a', '#b', '#c', '#d'] } },
    };
    expect(interpretMaplibreStyle(cfg)).toEqual(interpretMaplibreStyle(cfg));
  });

  it('categorical style is deterministic', () => {
    const cfg: FillLayer = {
      id: 'cat', type: 'fill',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: { color: { kind: 'categorical', field: 'type', map: { a: '#1', b: '#2', c: '#3' }, fallback: '#0' } },
    };
    expect(interpretMaplibreStyle(cfg)).toEqual(interpretMaplibreStyle(cfg));
  });
});
