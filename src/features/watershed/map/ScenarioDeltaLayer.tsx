'use client';
import { GeoJsonLayer } from '@deck.gl/layers';
import type { Feature, FeatureCollection } from 'geojson';
import { polygonKeyOf } from '../data/findWatershedFeature';

export interface BuildScenarioDeltaLayerProps {
  /** When null, layer is hidden (no scenario active). */
  scenarioId: string | null;
  /** Polygon FeatureCollection from useWatershedsForSite. */
  geometry: FeatureCollection | null;
  /** Per-polygon Δerosion (scenario - base) from useScenarioImpact. */
  watershedDeltas: Map<string, number>;
}

export const SCENARIO_DELTA_LAYER_ID = 'watershed-scenario-delta';

/** Diverging palette: green (improvement, Δ < 0) → muted gray (no change)
 * → coral (degradation, Δ > 0). Symmetric around 0 so a Δ of +X reads the
 * same magnitude as -X in opposite direction. */
function colorForDelta(delta: number, maxAbs: number): [number, number, number, number] {
  if (maxAbs <= 0) return [120, 120, 120, 180];
  const t = Math.max(-1, Math.min(1, delta / maxAbs));
  if (t === 0) return [180, 180, 180, 160];
  if (t < 0) {
    // green ramp
    const k = -t;
    return [
      Math.round(180 - 120 * k),
      Math.round(220 - 50 * k),
      Math.round(180 - 80 * k),
      210,
    ];
  }
  // coral ramp
  return [
    Math.round(220 + 30 * t),
    Math.round(140 - 60 * t),
    Math.round(120 - 80 * t),
    210,
  ];
}

/** Builds the GeoJsonLayer rendering watershed polygons coloured by their
 * scenario Δerosion. Returns null when no scenario is active or geometry
 * is missing. Same builder-not-component pattern as WS-026 / WS-029 /
 * WS-030 to avoid setProps clobbering. */
export function buildScenarioDeltaLayer(
  props: BuildScenarioDeltaLayerProps,
): GeoJsonLayer | null {
  const { scenarioId, geometry, watershedDeltas } = props;
  if (!scenarioId || !geometry) return null;
  if (watershedDeltas.size === 0) return null;

  let maxAbs = 0;
  for (const v of watershedDeltas.values()) {
    const a = Math.abs(v);
    if (a > maxAbs) maxAbs = a;
  }

  return new GeoJsonLayer({
    id: SCENARIO_DELTA_LAYER_ID,
    data: geometry,
    pickable: false,
    stroked: true,
    filled: true,
    getLineColor: [60, 60, 60, 150],
    getLineWidth: 1,
    lineWidthMinPixels: 1,
    getFillColor: (f: Feature) => {
      const key = polygonKeyOf((f.properties ?? {}) as Record<string, unknown>);
      const k = key === null ? null : String(key).replace(/\.0+$/, '');
      const delta = k !== null ? watershedDeltas.get(k) : undefined;
      return colorForDelta(delta ?? 0, maxAbs);
    },
    updateTriggers: {
      getFillColor: [scenarioId, maxAbs],
    },
  });
}
