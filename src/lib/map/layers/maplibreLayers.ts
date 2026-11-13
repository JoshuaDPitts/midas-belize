import type { MaplibreLayer } from './types';

export const SUPPORTED_ML_TYPES = new Set<MaplibreLayer['type']>([
  'fill',
  'line',
  'circle',
  'symbol',
  'fill-extrusion',
  'raster',
  'hillshade',
  'heatmap',
  'background',
]);

export function validateMaplibreLayer(cfg: MaplibreLayer): void {
  if (!cfg.id) throw new Error('[map-engine] layer missing id');
  if (!SUPPORTED_ML_TYPES.has(cfg.type)) {
    throw new Error(`[map-engine] unsupported MapLibre type: ${cfg.type}`);
  }
  if (!cfg.source) {
    throw new Error(`[map-engine] layer "${cfg.id}" missing source`);
  }
}
