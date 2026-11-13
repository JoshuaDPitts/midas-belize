import type { Layer } from '@deck.gl/core';
import {
  GeoJsonLayer,
  PolygonLayer,
  PathLayer,
  ScatterplotLayer,
  IconLayer,
  TextLayer,
  ColumnLayer,
} from '@deck.gl/layers';
import {
  HeatmapLayer,
  HexagonLayer,
  GridLayer,
  ContourLayer,
  ScreenGridLayer,
} from '@deck.gl/aggregation-layers';
import { H3HexagonLayer, MVTLayer, TerrainLayer, Tile3DLayer } from '@deck.gl/geo-layers';
import { SimpleMeshLayer, ScenegraphLayer } from '@deck.gl/mesh-layers';
import { CesiumIonLoader, Tiles3DLoader } from '@loaders.gl/3d-tiles';
import type {
  DeckColumnLayer,
  DeckContourLayer,
  DeckGeoJsonLayer,
  DeckGridLayer,
  DeckH3HexagonLayer,
  DeckHeatmapLayer,
  DeckHexagonLayer,
  DeckIconLayer,
  DeckLayer,
  DeckMVTLayer,
  DeckPathLayer,
  DeckPolygonLayer,
  DeckScatterplotLayer,
  DeckSceneGraphLayer,
  DeckScreenGridLayer,
  DeckSimpleMeshLayer,
  DeckTerrainLayer,
  DeckTextLayer,
  DeckTile3DLayer,
  LayerSource,
  StyleValue,
} from './types';

type Accessor<T> = (d: unknown) => T;

function resolveAccessor<T>(spec: string): Accessor<T> {
  // Dot-path support ("properties.r_factor", "geometry.coordinates") so
  // GeoJSON feature sources work without preprocessing.
  if (!spec.includes('.')) {
    return (d: unknown) => (d as Record<string, T>)[spec];
  }
  const parts = spec.split('.');
  return (d: unknown) => {
    let v: unknown = d;
    for (const p of parts) {
      if (v == null) return undefined as unknown as T;
      v = (v as Record<string, unknown>)[p];
    }
    return v as T;
  };
}

// Extracts the tagged-object variants of StyleValue<T>. We can't use
// `Extract<StyleValue<T>, { kind: string }>` because T is generic — TS
// conservatively assumes T itself might match `{ kind: string }` and gives
// back a union that includes the raw T. Spelling the variants out explicitly
// lets the switch narrow correctly.
type TaggedStyleValue<T> =
  | { kind: 'constant';     value: T }
  | { kind: 'graduated';    field: string; breaks: number[]; values: T[] }
  | { kind: 'categorical';  field: string; map: Record<string, T>; fallback?: T }
  | { kind: 'proportional'; field: string; domain: [number, number]; range: [T, T] };

function resolveStyleAccessor<T>(
  v: StyleValue<T> | undefined,
  fallback: T,
): T | Accessor<T> {
  if (v === undefined) return fallback;
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return v as T;
  const tagged = v as TaggedStyleValue<T>;
  switch (tagged.kind) {
    case 'constant':
      return tagged.value;
    case 'proportional': {
      const [d0, d1] = tagged.domain;
      const [r0, r1] = tagged.range as unknown as [number, number];
      return ((d: unknown) => {
        const x = Number((d as Record<string, number>)[tagged.field]);
        const t = Math.max(0, Math.min(1, (x - d0) / (d1 - d0)));
        return (r0 + t * (r1 - r0)) as unknown as T;
      }) as Accessor<T>;
    }
    case 'graduated': {
      const breaks = tagged.breaks;
      const vals = tagged.values as T[];
      return ((d: unknown) => {
        const x = Number((d as Record<string, number>)[tagged.field]);
        for (let i = 0; i < breaks.length; i++) if (x < breaks[i]) return vals[i];
        return vals[vals.length - 1];
      }) as Accessor<T>;
    }
    case 'categorical': {
      const map = tagged.map as Record<string, T>;
      return ((d: unknown) =>
        map[String((d as Record<string, unknown>)[tagged.field])] ??
        (tagged.fallback ?? fallback)) as Accessor<T>;
    }
    default:
      return fallback;
  }
}

export function sourceData(src: LayerSource): unknown {
  if (src.kind === 'geojson') return src.data;
  if (src.kind === 'array') return src.data;
  if (src.kind === 'vector-tile' || src.kind === 'raster-tile' || src.kind === 'cog') return src;
  return null;
}

export function isDeckLayerCfg(c: { type: string }): c is DeckLayer {
  return typeof c.type === 'string' && c.type.startsWith('deck.');
}

export function buildDeckLayer(cfg: DeckLayer): Layer {
  if (!isDeckLayerCfg(cfg)) {
    throw new Error('[map-engine] buildDeckLayer: config is not a deck.* variant');
  }
  switch (cfg.type) {
    case 'deck.geojson':
      return buildGeoJson(cfg);
    case 'deck.polygon':
      return buildPolygon(cfg);
    case 'deck.path':
      return buildPath(cfg);
    case 'deck.scatterplot':
      return buildScatterplot(cfg);
    case 'deck.icon':
      return buildIcon(cfg);
    case 'deck.text':
      return buildText(cfg);
    case 'deck.column':
      return buildColumn(cfg);
    case 'deck.heatmap':
      return buildHeatmap(cfg);
    case 'deck.hexagon':
      return buildHexagon(cfg);
    case 'deck.grid':
      return buildGrid(cfg);
    case 'deck.contour':
      return buildContour(cfg);
    case 'deck.screengrid':
      return buildScreenGrid(cfg);
    case 'deck.terrain':
      return buildTerrain(cfg);
    case 'deck.mvt':
      return buildMVT(cfg);
    case 'deck.tile3d':
      return buildTile3D(cfg);
    case 'deck.h3-hexagon':
      return buildH3Hexagon(cfg);
    case 'deck.simple-mesh':
      return buildSimpleMesh(cfg);
    case 'deck.scenegraph':
      return buildSceneGraph(cfg);
    default: {
      const _exhaustive: never = cfg;
      throw new Error(`[map-engine] buildDeckLayer: unhandled variant ${JSON.stringify(_exhaustive)}`);
    }
  }
}

function buildGeoJson(c: DeckGeoJsonLayer): Layer {
  return new GeoJsonLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    filled: c.style.filled ?? true,
    stroked: c.style.stroked ?? true,
    getFillColor: resolveStyleAccessor(c.style.fillColor, [59, 130, 246, 180]) as never,
    getLineColor: resolveStyleAccessor(c.style.lineColor, [255, 255, 255, 200]) as never,
    lineWidthMinPixels: c.style.lineWidthMinPixels ?? 1,
    pointRadiusMinPixels: c.style.pointRadiusMinPixels ?? 3,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildPolygon(c: DeckPolygonLayer): Layer {
  return new PolygonLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPolygon: resolveAccessor(c.getPolygon) as never,
    filled: c.style.filled ?? true,
    stroked: c.style.stroked ?? true,
    getFillColor: c.style.fillColor ?? [59, 130, 246, 180],
    getLineColor: c.style.lineColor ?? [255, 255, 255, 200],
    lineWidthMinPixels: c.style.lineWidthMinPixels ?? 1,
    lineJointRounded: true,
    lineCapRounded: true,
    extruded: c.style.extruded ?? false,
    getElevation:
      typeof c.style.elevation === 'string'
        ? (resolveAccessor<number>(c.style.elevation) as never)
        : (c.style.elevation ?? 0),
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildPath(c: DeckPathLayer): Layer {
  return new PathLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPath: resolveAccessor(c.getPath) as never,
    getColor: c.style.color ?? [59, 130, 246, 255],
    widthMinPixels: c.style.widthMinPixels ?? 2,
    capRounded: c.style.capRounded ?? true,
    jointRounded: c.style.jointRounded ?? true,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildScatterplot(c: DeckScatterplotLayer): Layer {
  return new ScatterplotLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPosition: resolveAccessor(c.getPosition) as never,
    getRadius: resolveStyleAccessor(c.style.radius, 6) as never,
    getFillColor: c.style.color ?? [59, 130, 246, 220],
    radiusMinPixels: c.style.radiusMinPixels ?? 2,
    radiusMaxPixels: c.style.radiusMaxPixels ?? 30,
    stroked: c.style.stroked ?? false,
    getLineColor: c.style.lineColor ?? [255, 255, 255, 255],
    lineWidthMinPixels: c.style.lineWidthMinPixels ?? 1,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
    updateTriggers: { getRadius: [c.style.radius], getFillColor: [c.style.color] },
  });
}

function buildIcon(c: DeckIconLayer): Layer {
  return new IconLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    iconAtlas: c.iconAtlas,
    iconMapping: c.iconMapping,
    getPosition: resolveAccessor(c.getPosition) as never,
    getIcon: () => c.style.icon,
    getSize: c.style.size ?? 24,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildText(c: DeckTextLayer): Layer {
  return new TextLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPosition: resolveAccessor(c.getPosition) as never,
    getText: resolveAccessor<string>(c.getText) as never,
    getSize: c.style.size ?? 12,
    getColor: c.style.color ?? [255, 255, 255, 255],
    background: c.style.background ?? false,
    getBackgroundColor: c.style.backgroundColor ?? [255, 255, 255, 230],
    backgroundPadding: c.style.backgroundPadding ?? [6, 4],
    getPixelOffset: c.style.pixelOffset ?? [0, 0],
    fontWeight: c.style.fontWeight ?? 400,
    fontFamily: c.style.fontFamily ?? 'sans-serif',
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildHeatmap(c: DeckHeatmapLayer): Layer {
  return new HeatmapLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    getPosition: resolveAccessor(c.getPosition) as never,
    getWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    radiusPixels: c.style.radiusPixels ?? 30,
    intensity: c.style.intensity ?? 1,
    threshold: c.style.threshold ?? 0.05,
    colorRange: c.style.colorRange as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildHexagon(c: DeckHexagonLayer): Layer {
  return new HexagonLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPosition: resolveAccessor(c.getPosition) as never,
    getColorWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    getElevationWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    radius: c.style.radius ?? 1000,
    elevationScale: c.style.elevationScale ?? 20,
    extruded: c.style.extruded ?? true,
    coverage: c.style.coverage ?? 0.9,
    upperPercentile: c.style.upperPercentile ?? 100,
    colorRange: c.style.colorRange as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildGrid(c: DeckGridLayer): Layer {
  return new GridLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPosition: resolveAccessor(c.getPosition) as never,
    getColorWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    getElevationWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    cellSize: c.style.cellSize ?? 2000,
    elevationScale: c.style.elevationScale ?? 20,
    extruded: c.style.extruded ?? true,
    colorRange: c.style.colorRange as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildContour(c: DeckContourLayer): Layer {
  return new ContourLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    getPosition: resolveAccessor(c.getPosition) as never,
    cellSize: c.style.cellSize ?? 2000,
    contours: c.style.contours as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildScreenGrid(c: DeckScreenGridLayer): Layer {
  return new ScreenGridLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    getPosition: resolveAccessor(c.getPosition) as never,
    getWeight: c.style.getWeight
      ? (resolveAccessor<number>(c.style.getWeight) as never)
      : 1,
    cellSizePixels: c.style.cellSizePixels ?? 20,
    colorRange: c.style.colorRange as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

// Terrarium encoding used by AWS Mapzen / Nextzen legacy tiles.
const TERRARIUM_DECODER = {
  rScaler: 256,
  gScaler: 1,
  bScaler: 1 / 256,
  offset: -32768,
};

function buildTerrain(c: DeckTerrainLayer): Layer {
  return new TerrainLayer({
    id: c.id,
    elevationData: c.elevationUrl,
    texture: c.textureUrl,
    elevationDecoder: c.style.elevationDecoder ?? TERRARIUM_DECODER,
    meshMaxError: c.style.meshMaxError ?? 4,
    minZoom: c.style.minZoom ?? 0,
    maxZoom: c.style.maxZoom ?? 15,
    color: c.style.color ?? [180, 180, 180, 255],
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildH3Hexagon(c: DeckH3HexagonLayer): Layer {
  const getValue = c.style.getValue
    ? (resolveAccessor<number>(c.style.getValue) as never)
    : 1;
  const domain = c.style.domain ?? [0, 1];
  const range = c.style.colorRange ?? [
    [68, 1, 84],
    [59, 82, 139],
    [33, 145, 140],
    [94, 201, 98],
    [253, 231, 37],
  ];
  const getFillColor = ((d: unknown) => {
    const x = typeof getValue === 'function'
      ? (getValue as (row: unknown) => number)(d)
      : 1;
    const t = Math.max(0, Math.min(1, (x - domain[0]) / (domain[1] - domain[0] || 1)));
    const idx = Math.min(range.length - 1, Math.floor(t * range.length));
    const col = range[idx] as [number, number, number, number] | [number, number, number];
    return col.length === 4 ? col : [col[0], col[1], col[2], 220];
  }) as never;
  return new H3HexagonLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getHexagon: resolveAccessor(c.getHexagon) as never,
    getFillColor,
    getElevation: getValue as never,
    elevationScale: c.style.elevationScale ?? 100,
    extruded: c.style.extruded ?? true,
    coverage: c.style.coverage ?? 0.9,
    filled: c.style.filled ?? true,
    stroked: c.style.stroked ?? false,
    lineWidthMinPixels: c.style.lineWidthMinPixels ?? 0,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildSimpleMesh(c: DeckSimpleMeshLayer): Layer {
  return new SimpleMeshLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    mesh: c.mesh as never,
    getPosition: resolveAccessor(c.getPosition) as never,
    getColor: c.style.getColor
      ? (resolveAccessor(c.style.getColor) as never)
      : (c.style.color as never) ?? [180, 180, 180, 255],
    getOrientation: c.style.getOrientation
      ? (resolveAccessor(c.style.getOrientation) as never)
      : [0, 0, 0],
    sizeScale: c.style.sizeScale ?? 1,
    wireframe: c.style.wireframe ?? false,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildSceneGraph(c: DeckSceneGraphLayer): Layer {
  return new ScenegraphLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    scenegraph: c.scenegraph as never,
    getPosition: resolveAccessor(c.getPosition) as never,
    getOrientation: c.style.getOrientation
      ? (resolveAccessor(c.style.getOrientation) as never)
      : [0, 0, 0],
    sizeScale: c.style.sizeScale ?? 1,
    _animations: c.style._animations as never,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildTile3D(c: DeckTile3DLayer): Layer {
  const useIon = c.style.ionAssetId != null && c.style.ionAccessToken != null;
  if (!useIon && !c.style.tilesetUrl) {
    throw new Error(
      '[map-engine] deck.tile3d: supply either (ionAssetId + ionAccessToken) or tilesetUrl',
    );
  }
  const data = useIon
    ? `https://assets.cesium.com/${c.style.ionAssetId}/tileset.json`
    : (c.style.tilesetUrl as string);
  return new Tile3DLayer({
    id: c.id,
    data,
    loader: (useIon ? CesiumIonLoader : Tiles3DLoader) as never,
    loadOptions: useIon
      ? { 'cesium-ion': { accessToken: c.style.ionAccessToken } }
      : undefined,
    pointSize: c.style.pointSize ?? 1,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildMVT(c: DeckMVTLayer): Layer {
  return new MVTLayer({
    id: c.id,
    data: c.tiles,
    pickable: c.interactive ?? false,
    minZoom: c.style.minZoom ?? 0,
    maxZoom: c.style.maxZoom ?? 14,
    filled: c.style.filled ?? true,
    stroked: c.style.stroked ?? true,
    getFillColor: c.style.getFillColor as never,
    getLineColor: c.style.getLineColor as never,
    getLineWidth: c.style.getLineWidth as never,
    lineWidthMinPixels: c.style.lineWidthMinPixels ?? 1,
    pointRadiusMinPixels: c.style.pointRadiusMinPixels ?? 2,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}

function buildColumn(c: DeckColumnLayer): Layer {
  return new ColumnLayer({
    id: c.id,
    data: sourceData(c.source) as never,
    pickable: c.interactive ?? false,
    getPosition: resolveAccessor(c.getPosition) as never,
    getElevation:
      typeof c.style.elevation === 'string'
        ? (resolveAccessor<number>(c.style.elevation) as never)
        : (c.style.elevation ?? 0),
    elevationScale: c.style.elevationScale ?? 1,
    getFillColor: c.style.color ?? [20, 184, 166, 220],
    radius: c.style.radius ?? 200,
    diskResolution: c.style.diskResolution ?? 24,
    extruded: c.style.extruded ?? true,
    opacity: c.opacity ?? 1,
    visible: c.visible !== false,
  });
}
