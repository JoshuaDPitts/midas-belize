/**
 * Converts the MIDAS/MIMES 6 km hex tessellation shapefile to GeoJSON for use
 * by the Deck.gl PolygonLayer demo. Computes per-hex area via Turf (the
 * shapefile's Shape_Area is in decimal degrees, which is not directly useful).
 *
 * Source:
 *   reference/MIMES_MIDAS/GIS Base Maps/Marine/Placencia/Coast/
 *     Hexagons6KM_ExportFeatures/Hexagons6KM_ExportFeatures.{shp,dbf,prj}
 *
 * Provenance (from the shapefile's sidecar metadata .shp.xml):
 *   - Generated 2026-01-08 by the MIDAS/MIMES 2026 project, ArcGIS Pro
 *     (GenerateTessellation → ExportFeatures).
 *   - Geometry: HEXAGON tessellation, 6 km² nominal cell area.
 *   - Extent: -89.226 to -87.486, 15.886 to 18.496 (Belize AOI).
 *   - CRS: EPSG:4326 (WGS84 geographic).
 *   - Attributes: GRID_ID (string), Shape_Leng (perimeter, degrees),
 *     Shape_Area (area, degrees²).
 *
 * Output: public/sample-data/map-engine/midas-hexgrid-6km.geojson
 *   Each feature.properties:
 *     grid_id    — original ArcGIS tessellation id
 *     area_km2   — real area via @turf/area (in km²)
 *     source     — citation
 *     license    — licensing note
 *
 * Run: pnpm exec tsx scripts/import-hex-grid.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as shapefile from 'shapefile';
import { area } from '@turf/turf';
import type { Feature, FeatureCollection, Polygon } from 'geojson';

const SHP =
  'reference/MIMES_MIDAS/GIS Base Maps/Marine/Placencia/Coast/Hexagons6KM_ExportFeatures/Hexagons6KM_ExportFeatures.shp';
const DBF = SHP.replace('.shp', '.dbf');
const OUT_DIR = 'public/sample-data/map-engine';
const OUT_FILE = 'midas-hexgrid-6km.geojson';

const CITATION =
  'MIDAS/MIMES Belize 2026 project — 6 km hexagonal tessellation (ArcGIS Pro GenerateTessellation, 2026-01-08). Source shapefile: Hexagons6KM_ExportFeatures.';
const LICENSE =
  'Shared by project collaborators for internal use. Not for public redistribution without provenance check.';

interface RawProps {
  GRID_ID: string;
  Shape_Leng?: number;
  Shape_Area?: number;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const src = await shapefile.open(SHP, DBF);
  const features: Feature<Polygon>[] = [];
  for (;;) {
    const { done, value } = await src.read();
    if (done) break;
    const f = value as Feature<Polygon, RawProps>;
    if (!f || !f.geometry) continue;
    features.push({
      type: 'Feature',
      geometry: f.geometry,
      properties: {
        grid_id: f.properties.GRID_ID,
        area_km2: Math.round((area(f) / 1_000_000) * 100) / 100,
        source: CITATION,
        license: LICENSE,
      },
    });
  }

  const out: FeatureCollection<Polygon> = { type: 'FeatureCollection', features };
  writeFileSync(join(OUT_DIR, OUT_FILE), JSON.stringify(out));
  const totalKm2 = features.reduce((s, f) => s + (f.properties!.area_km2 as number), 0);
  console.log(
    `wrote ${features.length} hexagons, total area ≈ ${Math.round(totalKm2)} km² → ${OUT_DIR}/${OUT_FILE}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
