/**
 * REQ-ME-006d — Tiles sub-batch, stage 1: TerrainLayer.
 *
 * Validates buildDeckLayer for the `deck.terrain` variant. TerrainLayer is
 * a composite layer (`TerrainLayer` wrapping `TileLayer` + mesh children),
 * so we assert against the public constructor identity plus the wiring of
 * the terrarium elevation decoder + texture URL.
 */

import { describe, it, expect } from 'vitest';
import { MVTLayer, TerrainLayer, Tile3DLayer } from '@deck.gl/geo-layers';
import { buildDeckLayer } from '@/lib/map/layers/deckLayers';
import type {
  DeckMVTLayer,
  DeckTerrainLayer,
  DeckTile3DLayer,
} from '@/lib/map/layers/types';

const baseCfg: DeckTerrainLayer = {
  id: 'terrain-under-test',
  type: 'deck.terrain',
  source: {
    kind: 'raster-tile',
    tiles: ['https://example.test/{z}/{x}/{y}.png'],
    tileSize: 256,
    maxzoom: 15,
  },
  elevationUrl: 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  textureUrl:
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  style: { meshMaxError: 4 },
};

describe('REQ-ME-006d: buildDeckLayer — deck.terrain', () => {
  it('builds a TerrainLayer with the configured id', () => {
    const layer = buildDeckLayer(baseCfg);
    expect(layer).toBeInstanceOf(TerrainLayer);
    expect(layer.id).toBe('terrain-under-test');
  });

  it('defaults to the Mapzen terrarium elevation decoder', () => {
    const layer = buildDeckLayer(baseCfg);
    const decoder = (layer.props as { elevationDecoder?: { offset: number } })
      .elevationDecoder;
    expect(decoder).toBeDefined();
    // Terrarium: elevation_m = (R*256 + G + B/256) - 32768
    expect(decoder!.offset).toBe(-32768);
  });

  it('respects an explicitly supplied elevation decoder', () => {
    const layer = buildDeckLayer({
      ...baseCfg,
      style: {
        meshMaxError: 4,
        elevationDecoder: { rScaler: 1, gScaler: 0, bScaler: 0, offset: 0 },
      },
    });
    const decoder = (layer.props as { elevationDecoder?: { rScaler: number } })
      .elevationDecoder;
    expect(decoder!.rScaler).toBe(1);
  });

  it('passes elevationData and texture URLs through to TerrainLayer', () => {
    const layer = buildDeckLayer(baseCfg);
    const props = layer.props as { elevationData?: string; texture?: string };
    expect(props.elevationData).toBe(baseCfg.elevationUrl);
    expect(props.texture).toBe(baseCfg.textureUrl);
  });

  it('works without a texture URL (pure DEM mesh)', () => {
    const layer = buildDeckLayer({ ...baseCfg, textureUrl: undefined });
    expect(layer).toBeInstanceOf(TerrainLayer);
    const props = layer.props as { texture?: string };
    expect(props.texture).toBeUndefined();
  });
});

describe('REQ-ME-006d: buildDeckLayer — deck.mvt', () => {
  const mvtBase: DeckMVTLayer = {
    id: 'mvt-under-test',
    type: 'deck.mvt',
    source: {
      kind: 'vector-tile',
      url: 'https://example.test/tiles',
      sourceLayer: '',
    },
    tiles: 'https://example.test/tiles',
    style: {
      minZoom: 0,
      maxZoom: 14,
      filled: true,
      stroked: true,
      getFillColor: () => [0, 0, 0, 255],
    },
  };

  it('builds an MVTLayer with the configured id', () => {
    const layer = buildDeckLayer(mvtBase);
    expect(layer).toBeInstanceOf(MVTLayer);
    expect(layer.id).toBe('mvt-under-test');
  });

  it('forwards the tileJSON URL as data', () => {
    const layer = buildDeckLayer(mvtBase);
    const props = layer.props as { data?: string | string[] };
    expect(props.data).toBe('https://example.test/tiles');
  });

  it('accepts an array of tile URL templates', () => {
    const layer = buildDeckLayer({
      ...mvtBase,
      tiles: ['https://a.example/{z}/{x}/{y}.pbf', 'https://b.example/{z}/{x}/{y}.pbf'],
    });
    const props = layer.props as { data?: string[] };
    expect(Array.isArray(props.data)).toBe(true);
    expect(props.data).toHaveLength(2);
  });
});

describe('REQ-ME-006d: buildDeckLayer — deck.tile3d', () => {
  const tilesetCfg: DeckTile3DLayer = {
    id: 't3d-direct',
    type: 'deck.tile3d',
    source: {
      kind: 'vector-tile',
      url: 'https://example.test/tileset.json',
      sourceLayer: '',
    },
    style: { tilesetUrl: 'https://example.test/tileset.json' },
  };

  const ionCfg: DeckTile3DLayer = {
    id: 't3d-ion',
    type: 'deck.tile3d',
    source: {
      kind: 'vector-tile',
      url: 'ion://2275207',
      sourceLayer: '',
    },
    style: {
      ionAssetId: 2275207,
      ionAccessToken: 'fake-token-for-test',
    },
  };

  it('builds a Tile3DLayer from a direct tileset URL', () => {
    const layer = buildDeckLayer(tilesetCfg);
    expect(layer).toBeInstanceOf(Tile3DLayer);
    expect(layer.id).toBe('t3d-direct');
    expect((layer.props as { data?: string }).data).toBe(
      'https://example.test/tileset.json',
    );
  });

  it('builds a Tile3DLayer from a Cesium ion asset id + token', () => {
    const layer = buildDeckLayer(ionCfg);
    expect(layer).toBeInstanceOf(Tile3DLayer);
    const props = layer.props as {
      data?: string;
      loadOptions?: { 'cesium-ion'?: { accessToken?: string } };
    };
    expect(props.data).toContain('/2275207/tileset.json');
    expect(props.loadOptions?.['cesium-ion']?.accessToken).toBe(
      'fake-token-for-test',
    );
  });

  it('throws when neither tilesetUrl nor (ionAssetId + ionAccessToken) is set', () => {
    expect(() =>
      buildDeckLayer({ ...tilesetCfg, style: {} }),
    ).toThrow(/deck.tile3d/);
  });
});
