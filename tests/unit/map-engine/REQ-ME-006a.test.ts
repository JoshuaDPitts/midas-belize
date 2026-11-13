import { describe, it, expect } from 'vitest';
import { buildDeckLayer, isDeckLayerCfg } from '@/lib/map/layers/deckLayers';
import type {
  DeckGeoJsonLayer,
  DeckPolygonLayer,
  DeckPathLayer,
  DeckScatterplotLayer,
  DeckTextLayer,
  DeckColumnLayer,
  LayerConfig,
} from '@/lib/map/layers/types';

describe('REQ-ME-006a: buildDeckLayer — vector batch', () => {
  it('builds a GeoJsonLayer from deck.geojson config', () => {
    const cfg: DeckGeoJsonLayer = {
      id: 'g1',
      type: 'deck.geojson',
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: { filled: true, fillColor: [20, 184, 166, 200] },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.id).toBe('g1');
    expect(layer.constructor.name).toBe('GeoJsonLayer');
  });

  it('builds a PolygonLayer with accessor', () => {
    const cfg: DeckPolygonLayer = {
      id: 'p1',
      type: 'deck.polygon',
      source: { kind: 'array', data: [{ ring: [[-88.5, 17.1], [-88.3, 17.1], [-88.4, 17.3]] }] },
      getPolygon: 'ring',
      style: { filled: true, fillColor: [20, 184, 166, 200] },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('PolygonLayer');
  });

  it('builds a PathLayer', () => {
    const cfg: DeckPathLayer = {
      id: 'path1',
      type: 'deck.path',
      source: { kind: 'array', data: [{ coords: [[-88.4, 17.1], [-88.3, 17.2]] }] },
      getPath: 'coords',
      style: { color: [245, 158, 11, 255], widthMinPixels: 3 },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('PathLayer');
  });

  it('builds a ScatterplotLayer with proportional-radius style', () => {
    const cfg: DeckScatterplotLayer = {
      id: 's1',
      type: 'deck.scatterplot',
      source: { kind: 'array', data: [{ coord: [-88.2, 17.1], n: 5 }] },
      getPosition: 'coord',
      style: {
        radius: { kind: 'proportional', field: 'n', domain: [0, 10], range: [2, 10] },
        color: [239, 68, 68, 255],
      },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('ScatterplotLayer');
  });

  it('builds a TextLayer with label accessor', () => {
    const cfg: DeckTextLayer = {
      id: 't1',
      type: 'deck.text',
      source: { kind: 'array', data: [{ coord: [-88.5, 17.0], label: 'Hello' }] },
      getPosition: 'coord',
      getText: 'label',
      style: { size: 12, color: [255, 255, 255, 255] },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('TextLayer');
  });

  it('builds a ColumnLayer extruded by field accessor', () => {
    const cfg: DeckColumnLayer = {
      id: 'c1',
      type: 'deck.column',
      source: { kind: 'array', data: [{ coord: [-88.5, 17.0], v: 40 }] },
      getPosition: 'coord',
      style: { elevation: 'v', radius: 2000, extruded: true },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('ColumnLayer');
  });

  it('rejects a non-deck config', () => {
    const bad = { id: 'x', type: 'fill' } as unknown as LayerConfig;
    expect(() => buildDeckLayer(bad as never)).toThrow(/not a deck/i);
  });

  it('isDeckLayerCfg discriminates deck.* prefix', () => {
    expect(isDeckLayerCfg({ type: 'deck.geojson' })).toBe(true);
    expect(isDeckLayerCfg({ type: 'fill' })).toBe(false);
  });
});
