// src/lib/map/core/styles.ts
import type { StyleSpecification } from 'maplibre-gl';

export type BasemapId = 'light' | 'dark' | 'satellite' | 'terrain';

export interface BasemapDef {
  label: string;
  /** Either a URL to a MapLibre style JSON, or an inline StyleSpecification. */
  style: string | StyleSpecification;
  attribution: string;
}

const rasterStyle = (
  sourceUrl: string,
  tiles: string[],
  attribution: string,
  tileSize = 256,
  maxzoom = 19,
): StyleSpecification => ({
  version: 8,
  sources: {
    [sourceUrl]: {
      type: 'raster',
      tiles,
      tileSize,
      attribution,
      maxzoom,
    },
  },
  layers: [{ id: sourceUrl, type: 'raster', source: sourceUrl }],
});

/**
 * Stack of raster layers rendered bottom-to-top (e.g. a base fill + a
 * transparent labels/reference overlay). Used for the Esri "Gray Canvas"
 * light/dark basemaps, which split shaded land/ocean (base) from place
 * labels (reference) into two tile services.
 */
const multiRasterStyle = (
  layers: { id: string; tiles: string[] }[],
  attribution: string,
  maxzoom = 16,
): StyleSpecification => ({
  version: 8,
  sources: Object.fromEntries(
    layers.map((l) => [
      l.id,
      { type: 'raster', tiles: l.tiles, tileSize: 256, attribution, maxzoom } as const,
    ]),
  ),
  layers: layers.map((l) => ({ id: l.id, type: 'raster', source: l.id })),
});

const esriCanvas = (variant: 'Light' | 'Dark'): StyleSpecification =>
  multiRasterStyle(
    [
      {
        id: `esri-${variant.toLowerCase()}-gray-base`,
        tiles: [
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${variant}_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
        ],
      },
      {
        id: `esri-${variant.toLowerCase()}-gray-reference`,
        tiles: [
          `https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_${variant}_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
        ],
      },
    ],
    'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
  );

// Esri Ocean: bathymetric blue water — the right "light" basemap for a reef
// app. CARTO Voyager and Esri Gray Canvas both wash the open ocean out to
// near-white at reef zoom; this renders the sea as sea.
//
// IMPORTANT: World_Ocean_Base only has real data through z10 here; z11+ returns
// a "Map data not yet available" placeholder tile. So we cap the source at
// maxzoom 10 and let MapLibre overzoom (upscale) the real z10 bathymetry — soft
// but blue, and no placeholder watermark. The reference/labels layer is dropped
// (nothing to label over open ocean, and upscaled labels look bad).
const OCEAN_MAX_DATA_ZOOM = 10;
const esriOcean = (): StyleSpecification =>
  multiRasterStyle(
    [
      {
        id: 'esri-ocean-base',
        tiles: [
          'https://services.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
        ],
      },
    ],
    'Tiles © Esri — GEBCO, NOAA, National Geographic, Garmin, HERE, and other contributors',
    OCEAN_MAX_DATA_ZOOM,
  );

export const BASEMAPS: Record<BasemapId, BasemapDef> = {
  light: {
    // Esri Ocean: bathymetric blue water + coastline + labels. Both CARTO
    // Voyager and Esri Gray Canvas washed the open ocean out to near-white at
    // reef zoom; Ocean renders the sea as sea, which suits a reef app.
    label: 'Light',
    style: esriOcean(),
    attribution: 'Tiles © Esri — GEBCO, NOAA, National Geographic, Garmin, HERE, and other contributors',
  },
  dark: {
    // Esri Dark Gray Canvas: dark counterpart with the same ocean/coastline
    // context. Replaces OpenFreeMap dark (blank black over open ocean).
    label: 'Dark',
    style: esriCanvas('Dark'),
    attribution: 'Tiles © Esri — Esri, HERE, Garmin, © OpenStreetMap contributors',
  },
  satellite: {
    label: 'Satellite',
    style: rasterStyle(
      'esri-world-imagery',
      [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
      256,
      19,
    ),
    attribution: 'Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics',
  },
  terrain: {
    label: 'Terrain',
    style: rasterStyle(
      'opentopomap',
      [
        'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
        'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
      ],
      '© OpenStreetMap, SRTM — style © OpenTopoMap (CC-BY-SA)',
      256,
      17,
    ),
    attribution: '© OpenStreetMap, SRTM — style © OpenTopoMap (CC-BY-SA)',
  },
};
