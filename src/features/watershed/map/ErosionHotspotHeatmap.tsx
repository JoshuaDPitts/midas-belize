'use client';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { centroid } from '@turf/turf';
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from 'geojson';

/** Per-point input row for the HexagonLayer aggregator. Each row carries
 * one watershed centroid's RUSLE A weight (annual soil loss). When a row
 * has weight 0 (e.g. K=0 from ocean-masked SoilGrids edges), the layer
 * still aggregates it but contributes nothing to the hex height. */
export interface HotspotPoint {
  position: [number, number];
  weight: number;
}

/** Convert a FeatureCollection of watershed polygons with `A_t_ha_yr`
 * properties (joined from the rusle-factors dataset) into the
 * (position, weight) points the HexagonLayer consumes. Polygons missing
 * the A value get weight 0 instead of being skipped so the layer's
 * `colorScale` still sees the polygon's footprint. */
export function polygonsToHotspotPoints(
  geometry: FeatureCollection | null,
): HotspotPoint[] {
  if (!geometry) return [];
  const out: HotspotPoint[] = [];
  for (const f of geometry.features) {
    if (f.geometry.type !== 'Polygon' && f.geometry.type !== 'MultiPolygon') continue;
    try {
      const c = centroid(f as Feature<Polygon | MultiPolygon>);
      const [lng, lat] = c.geometry.coordinates;
      const a = (f.properties as Record<string, unknown> | null)?.A_t_ha_yr;
      const weight = typeof a === 'number' && Number.isFinite(a) ? Math.max(0, a) : 0;
      out.push({ position: [lng, lat], weight });
    } catch {
      // Skip degenerate geometry.
    }
  }
  return out;
}

export interface BuildHotspotLayerProps {
  enabled: boolean;
  geometry: FeatureCollection | null;
}

const LAYER_ID = 'watershed-erosion-hotspots';
/** Hex radius in meters. 2 km hexagons aggregate Belize-scale watersheds
 * tightly enough to show neighbourhood-level erosion clustering without
 * collapsing the entire country into ~6 cells. */
const HEX_RADIUS_M = 2000;
const OPACITY = 0.45;
/** Sequential yellow → coral palette, matching the erosion-risk encoder
 * family from WS-009. */
const COLOR_RANGE: [number, number, number][] = [
  [255, 247, 220],
  [254, 224, 144],
  [253, 174, 97],
  [244, 109, 67],
  [215, 48, 39],
  [165, 15, 21],
];

export function buildErosionHotspotLayer(
  props: BuildHotspotLayerProps,
): HexagonLayer<HotspotPoint> | null {
  const { enabled, geometry } = props;
  if (!enabled) return null;
  const data = polygonsToHotspotPoints(geometry);
  if (data.length === 0) return null;
  return new HexagonLayer<HotspotPoint>({
    id: LAYER_ID,
    data,
    pickable: false,
    radius: HEX_RADIUS_M,
    opacity: OPACITY,
    extruded: false,
    colorRange: COLOR_RANGE,
    getPosition: (d) => d.position,
    getColorWeight: (d) => d.weight,
    colorAggregation: 'SUM',
  });
}

export { LAYER_ID as EROSION_HOTSPOT_LAYER_ID };
