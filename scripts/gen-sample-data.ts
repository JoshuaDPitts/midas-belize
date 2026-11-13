/**
 * Fetches real Belize ADM1 (district) polygons from geoBoundaries and enriches
 * each feature with area_km2 computed via Turf. Output drives the ME-005 demo
 * (MapLibre native layer types).
 *
 * Sources:
 *   - geoBoundaries v4 (Open), Belize ADM1, simplified — CC-BY 2.5
 *     https://www.geoboundaries.org/   /   https://github.com/wmgeolab/geoBoundaries
 *     Release: 9469f09 (build Dec 2023, representation year 2006).
 *     Sources cited by geoBoundaries: Wikimedia Commons.
 *
 * Output: public/sample-data/map-engine/belize-admin.geojson
 *   Each feature.properties:
 *     district     — string (shapeName from geoBoundaries)
 *     iso          — string (shapeISO, e.g. BZ-CY)
 *     area_km2     — number (derived via @turf/area)
 *     source       — citation string (embedded in every feature)
 *     license      — "CC-BY 2.5"
 *
 * Run:  pnpm dlx tsx scripts/gen-sample-data.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { area } from '@turf/turf';
import type { Feature, FeatureCollection, Polygon, MultiPolygon } from 'geojson';

const SOURCE_URL =
  'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BLZ/ADM1/geoBoundaries-BLZ-ADM1_simplified.geojson';
const CITATION =
  'geoBoundaries v4 (Open), BLZ ADM1 simplified, release 9469f09 (2023-12). https://www.geoboundaries.org/';
const LICENSE = 'CC-BY 2.5';

const OUT_DIR = 'public/sample-data/map-engine';
mkdirSync(OUT_DIR, { recursive: true });

interface GbProps {
  shapeName: string;
  shapeISO: string;
  shapeID: string;
  shapeGroup: string;
  shapeType: string;
}

async function main() {
  const res = await fetch(SOURCE_URL);
  if (!res.ok) {
    throw new Error(`[gen-sample-data] failed to fetch ${SOURCE_URL}: ${res.status} ${res.statusText}`);
  }
  const src = (await res.json()) as FeatureCollection<Polygon | MultiPolygon, GbProps>;

  const features: Feature<Polygon | MultiPolygon>[] = src.features.map((f) => ({
    type: 'Feature',
    geometry: f.geometry,
    properties: {
      district: f.properties.shapeName,
      iso: f.properties.shapeISO,
      area_km2: Math.round(area(f) / 1_000_000),
      source: CITATION,
      license: LICENSE,
    },
  }));

  const out: FeatureCollection<Polygon | MultiPolygon> = {
    type: 'FeatureCollection',
    features,
  };

  writeFileSync(join(OUT_DIR, 'belize-admin.geojson'), JSON.stringify(out, null, 2));
  const totalKm2 = features.reduce((s, f) => s + (f.properties!.area_km2 as number), 0);
  console.log(`wrote ${features.length} districts, total area ≈ ${totalKm2} km² → ${OUT_DIR}/belize-admin.geojson`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
