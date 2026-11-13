// src/lib/map/layers/types.ts
import type { Feature, FeatureCollection, LineString, Polygon } from 'geojson';

// ——— Common source definitions ———

export interface GeoJsonSource {
  kind: 'geojson';
  data: FeatureCollection | Feature | string; // inline or URL
  /** Feature property to promote to numeric/string feature.id — required for
   * MapLibre `setFeatureState` on string-keyed features (ME-007 highlight). */
  promoteId?: string;
}

export interface VectorTileSource {
  kind: 'vector-tile';
  url: string; // tileJSON or template
  sourceLayer: string;
}

export interface RasterTileSource {
  kind: 'raster-tile';
  tiles: string[];
  tileSize?: number;
  minzoom?: number;
  maxzoom?: number;
}

export interface CogSource {
  kind: 'cog';
  url: string;
}

export interface InlineArraySource<T> {
  kind: 'array';
  data: T[];
}

export type LayerSource =
  | GeoJsonSource
  | VectorTileSource
  | RasterTileSource
  | CogSource
  | InlineArraySource<unknown>;

// ——— Shared layer fields ———

export interface LayerBase {
  id: string;
  source: LayerSource;
  interactive?: boolean;
  minzoom?: number;
  maxzoom?: number;
  visible?: boolean;
  opacity?: number;
  beforeId?: string; // ordering hint
  /** Human-readable label for legends + layer lists. Falls back to `id`. */
  label?: string;
  /** Unit for the legend value axis (e.g., "km²", "hours"). */
  unit?: string;
  /** Optional highlight styling applied when the feature is hovered or
   * selected (ME-007). For MapLibre variants the interpreter wraps color
   * and opacity paints with feature-state `case` expressions. Non-color
   * paints are untouched. Requires `interactive: true`. */
  interactionStyle?: {
    hoverColor?: string;
    hoverOpacity?: number;
    selectedColor?: string;
    selectedOpacity?: number;
  };
}

// ——— Style primitives used by multiple variants ———

/** A constant, or a data-driven mapping. */
export type StyleValue<T> =
  | T
  | { kind: 'constant'; value: T }
  | { kind: 'graduated'; field: string; breaks: number[]; values: T[] }
  | { kind: 'categorical'; field: string; map: Record<string, T>; fallback?: T }
  | { kind: 'proportional'; field: string; domain: [number, number]; range: [T, T] };

// ——— MapLibre native variants (filled out in Task 11) ———

export interface FillLayer extends LayerBase {
  type: 'fill';
  style: {
    color?: StyleValue<string>;
    outlineColor?: StyleValue<string>;
    opacity?: StyleValue<number>;
  };
}
export interface LineLayer extends LayerBase {
  type: 'line';
  style: {
    color?: StyleValue<string>;
    width?: StyleValue<number>;
    dasharray?: number[];
    opacity?: StyleValue<number>;
  };
}
export interface CircleLayer extends LayerBase {
  type: 'circle';
  style: {
    color?: StyleValue<string>;
    radius?: StyleValue<number>;
    strokeColor?: StyleValue<string>;
    strokeWidth?: StyleValue<number>;
    opacity?: StyleValue<number>;
  };
}
export interface SymbolLayer extends LayerBase {
  type: 'symbol';
  style: {
    icon?: StyleValue<string>;
    iconSize?: StyleValue<number>;
    text?: StyleValue<string>;
    textSize?: StyleValue<number>;
    textColor?: StyleValue<string>;
  };
}
export interface FillExtrusionLayer extends LayerBase {
  type: 'fill-extrusion';
  style: {
    color?: StyleValue<string>;
    height?: StyleValue<number>;
    base?: StyleValue<number>;
    opacity?: StyleValue<number>;
  };
}
export interface RasterLayer extends LayerBase {
  type: 'raster';
  style: { opacity?: number };
}
export interface HillshadeLayer extends LayerBase {
  type: 'hillshade';
  style: { shadowColor?: string; highlightColor?: string };
}
export interface HeatmapLayer extends LayerBase {
  type: 'heatmap';
  style: {
    weight?: StyleValue<number>;
    radius?: StyleValue<number>;
    intensity?: number;
    colorRamp?: string[]; // low→high
  };
}
export interface BackgroundLayer extends LayerBase {
  type: 'background';
  style: { color?: string };
}

export type MaplibreLayer =
  | FillLayer | LineLayer | CircleLayer | SymbolLayer | FillExtrusionLayer
  | RasterLayer | HillshadeLayer | HeatmapLayer | BackgroundLayer;

// ——— Deck.gl: vector variants (Task 12) ———

export interface DeckGeoJsonLayer extends LayerBase {
  type: 'deck.geojson';
  style: {
    filled?: boolean;
    stroked?: boolean;
    fillColor?: StyleValue<[number, number, number, number] | [number, number, number]>;
    lineColor?: StyleValue<[number, number, number, number] | [number, number, number]>;
    lineWidthMinPixels?: number;
    pointRadiusMinPixels?: number;
  };
}
export interface DeckPolygonLayer extends LayerBase {
  type: 'deck.polygon';
  getPolygon: string;
  style: {
    filled?: boolean;
    stroked?: boolean;
    fillColor?: [number, number, number] | [number, number, number, number];
    lineColor?: [number, number, number] | [number, number, number, number];
    lineWidthMinPixels?: number;
    elevation?: string | number;
    extruded?: boolean;
  };
}
export interface DeckPathLayer extends LayerBase {
  type: 'deck.path';
  getPath: string;
  style: {
    color?: [number, number, number] | [number, number, number, number];
    widthMinPixels?: number;
    capRounded?: boolean;
    jointRounded?: boolean;
  };
}
export interface DeckScatterplotLayer extends LayerBase {
  type: 'deck.scatterplot';
  getPosition: string;
  style: {
    radius?: StyleValue<number>;
    color?: [number, number, number] | [number, number, number, number];
    stroked?: boolean;
    lineColor?: [number, number, number] | [number, number, number, number];
    lineWidthMinPixels?: number;
    radiusMinPixels?: number;
    radiusMaxPixels?: number;
  };
}
export interface DeckIconLayer extends LayerBase {
  type: 'deck.icon';
  getPosition: string;
  iconAtlas: string;
  iconMapping: Record<string, { x: number; y: number; width: number; height: number; mask?: boolean }>;
  style: { icon: string; size?: number };
}
export interface DeckTextLayer extends LayerBase {
  type: 'deck.text';
  getPosition: string;
  getText: string;
  style: {
    size?: number;
    color?: [number, number, number] | [number, number, number, number];
    background?: boolean;
    backgroundColor?: [number, number, number] | [number, number, number, number];
    backgroundPadding?: [number, number] | [number, number, number, number];
    pixelOffset?: [number, number];
    fontWeight?: number;
    fontFamily?: string;
  };
}
export interface DeckColumnLayer extends LayerBase {
  type: 'deck.column';
  getPosition: string;
  style: {
    elevation?: string | number;
    elevationScale?: number;
    color?: [number, number, number] | [number, number, number, number];
    radius?: number;
    extruded?: boolean;
    diskResolution?: number;
  };
}

// ——— Deck.gl: aggregation variants (Task 13) ———

type ColorRgb = [number, number, number] | [number, number, number, number];

interface AggregationStyleBase {
  /** Accessor field name for weight (optional — default 1). */
  getWeight?: string;
  colorRange?: ColorRgb[];
}

export interface DeckHeatmapLayer extends LayerBase {
  type: 'deck.heatmap';
  getPosition: string;
  style: AggregationStyleBase & {
    radiusPixels?: number;
    intensity?: number;
    threshold?: number;
  };
}
export interface DeckHexagonLayer extends LayerBase {
  type: 'deck.hexagon';
  getPosition: string;
  style: AggregationStyleBase & {
    radius?: number;
    elevationScale?: number;
    extruded?: boolean;
    coverage?: number;
    upperPercentile?: number;
  };
}
export interface DeckGridLayer extends LayerBase {
  type: 'deck.grid';
  getPosition: string;
  style: AggregationStyleBase & {
    cellSize?: number;
    elevationScale?: number;
    extruded?: boolean;
  };
}
export interface DeckContourLayer extends LayerBase {
  type: 'deck.contour';
  getPosition: string;
  style: {
    cellSize?: number;
    contours: { threshold: number; color: ColorRgb; strokeWidth?: number }[];
  };
}
export interface DeckScreenGridLayer extends LayerBase {
  type: 'deck.screengrid';
  getPosition: string;
  style: AggregationStyleBase & { cellSizePixels?: number };
}

export type DeckAggregationLayer =
  | DeckHeatmapLayer
  | DeckHexagonLayer
  | DeckGridLayer
  | DeckContourLayer
  | DeckScreenGridLayer;

// ——— Deck.gl: tile variants (Task 15) ———

/**
 * TerrainLayer — reconstructs a 3D terrain mesh from DEM tiles (terrarium
 * PNG encoding) and optionally drapes a raster texture over it.
 *
 * Terrarium encoding: elevation_m = (R*256 + G + B/256) - 32768.
 */
export interface DeckTerrainLayer extends LayerBase {
  type: 'deck.terrain';
  /** URL template for elevation PNG tiles (terrarium-encoded). */
  elevationUrl: string;
  /** Optional URL template for texture tiles draped over the terrain. */
  textureUrl?: string;
  style: {
    /** Max allowed geometric error in pixels when simplifying the mesh. */
    meshMaxError?: number;
    minZoom?: number;
    maxZoom?: number;
    /** Fallback color when no texture is supplied. */
    color?: [number, number, number] | [number, number, number, number];
    /** Terrarium decoder — defaults match AWS Mapzen tiles. */
    elevationDecoder?: {
      rScaler: number;
      gScaler: number;
      bScaler: number;
      offset: number;
    };
  };
}

/**
 * MVTLayer — Deck.gl's client-side renderer for Mapbox Vector Tiles. Unlike
 * MapLibre (which parses MVT internally and paints via its style spec),
 * this variant exposes the decoded features to Deck's accessor system so
 * you can style / filter / interact with them like any other Deck layer.
 */
export interface DeckMVTLayer extends LayerBase {
  type: 'deck.mvt';
  /** Tile URL template or tileJSON URL. */
  tiles: string | string[];
  style: {
    minZoom?: number;
    maxZoom?: number;
    /** Accessor returning [r,g,b] or [r,g,b,a] from a feature. */
    getFillColor?: (feature: unknown) => [number, number, number] | [number, number, number, number];
    getLineColor?: (feature: unknown) => [number, number, number] | [number, number, number, number];
    getLineWidth?: number | ((feature: unknown) => number);
    lineWidthMinPixels?: number;
    pointRadiusMinPixels?: number;
    filled?: boolean;
    stroked?: boolean;
  };
}

/**
 * Tile3DLayer — streams OGC 3D Tiles (batched mesh / photo-3D / point-cloud).
 * Supports Cesium ion assets (via `ionAssetId` + `ionAccessToken`) or a raw
 * tileset.json URL.
 */
export interface DeckTile3DLayer extends LayerBase {
  type: 'deck.tile3d';
  style: {
    /** Cesium ion asset id — uses the Cesium loader. Mutually exclusive with `tilesetUrl`. */
    ionAssetId?: number;
    /** Cesium ion bearer token (required iff `ionAssetId` is set). */
    ionAccessToken?: string;
    /** Direct tileset.json URL — uses the generic 3D-Tiles loader. */
    tilesetUrl?: string;
    pointSize?: number;
  };
}

export type DeckTileLayer = DeckTerrainLayer | DeckMVTLayer | DeckTile3DLayer;

// Forward alias — filled when real flow data lands.
export type DeckFlowLayer = never;

// ——— Deck.gl: mesh variants (Task 16 — engine-only per DEC-014) ———

type ColorRgbMesh = [number, number, number] | [number, number, number, number];

/**
 * SimpleMeshLayer — places a single static mesh (OBJ / parsed geometry) at
 * multiple positions. Useful for identical markers: rover waypoints, sensor
 * stakes, ecosystem-marker icons. No animation.
 */
export interface DeckSimpleMeshLayer extends LayerBase {
  type: 'deck.simple-mesh';
  getPosition: string;
  /** URL to an OBJ file, OR a parsed mesh geometry object. */
  mesh: string | object;
  style: {
    sizeScale?: number;
    color?: ColorRgbMesh;
    wireframe?: boolean;
    getOrientation?: string;
    getColor?: string;
  };
}

/**
 * SceneGraphLayer — renders glTF scene graphs (multi-mesh, animations,
 * materials). Heavier than SimpleMeshLayer; used when a real 3D asset is
 * available (e.g. research-vessel model, reef-monument).
 */
export interface DeckSceneGraphLayer extends LayerBase {
  type: 'deck.scenegraph';
  getPosition: string;
  /** URL to a glTF / glb scene graph, OR a parsed scene graph object. */
  scenegraph: string | object;
  style: {
    sizeScale?: number;
    getOrientation?: string;
    /** Named animation within the glTF, or `*` for all. */
    _animations?: Record<string, { speed?: number; playing?: boolean }>;
  };
}

export type DeckMeshLayer = DeckSimpleMeshLayer | DeckSceneGraphLayer;

// ——— Deck.gl: H3 variants (Task 17) ———

type ColorRgbH3 = [number, number, number] | [number, number, number, number];

/**
 * H3HexagonLayer — renders hexagons directly from Uber's H3 spatial-index
 * strings. Unlike the GPU-binned HexagonLayer (which produces pixel-space
 * clusters that shift with zoom), H3 cells are globally consistent: the
 * same cell ID always renders the same hex on the sphere.
 */
export interface DeckH3HexagonLayer extends LayerBase {
  type: 'deck.h3-hexagon';
  /** Accessor returning the H3 cell index string from a data row. */
  getHexagon: string;
  style: {
    /** Accessor field returning the extrusion weight / color weight. */
    getValue?: string;
    /** Value-domain endpoints for the color ramp. */
    domain?: [number, number];
    /** Color ramp (low→high). */
    colorRange?: ColorRgbH3[];
    extruded?: boolean;
    elevationScale?: number;
    coverage?: number;
    filled?: boolean;
    stroked?: boolean;
    lineWidthMinPixels?: number;
  };
}

export type DeckH3Layer = DeckH3HexagonLayer;

export type DeckLayer =
  | DeckGeoJsonLayer
  | DeckPolygonLayer
  | DeckPathLayer
  | DeckScatterplotLayer
  | DeckIconLayer
  | DeckTextLayer
  | DeckColumnLayer
  | DeckAggregationLayer
  | DeckFlowLayer
  | DeckTileLayer
  | DeckMeshLayer
  | DeckH3Layer;

// ——— Union ———

export type LayerConfig = MaplibreLayer | DeckLayer;

export type LayerType = LayerConfig['type'];

// ——— Error types ———

export class LayerNotFoundError extends Error {
  constructor(id: string) { super(`Layer "${id}" not found`); this.name = 'LayerNotFoundError'; }
}
export class LayerAlreadyExistsError extends Error {
  constructor(id: string) { super(`Layer "${id}" already exists`); this.name = 'LayerAlreadyExistsError'; }
}
