/**
 * Converts the GloREDa (Global Rainfall Erosivity Database) station
 * shapefile to a minimal GeoJSON for use by the Deck.gl aggregation demos
 * (T13 ME-006b — HexagonLayer / HeatmapLayer / GridLayer / ContourLayer /
 * ScreenGridLayer).
 *
 * Source:
 *   reference/NSFCOPES_BU/Rfactor-Stations.{shp,dbf,prj}
 *
 * Provenance:
 *   Panagos, P., Borrelli, P., Meusburger, K., Yu, B., Klik, A., Lim, K.J.,
 *   Yang, J.E., Ni, J., Miao, C., Chattopadhyay, N., Sadeghi, S.H.,
 *   Hazbavi, Z., Zabihi, M., Larionov, G.A., Krasnov, S.F., Gorobets, A.V.,
 *   Levi, Y., Erpul, G., Birkel, C., Hoyos, N., Naipal, V., Oliveira, P.T.S.,
 *   Bonilla, C.A., Meddi, M., Nel, W., Al Dashti, H., Boni, M.,
 *   Diodato, N., Van Oost, K., Nearing, M.A., Ballabio, C. (2017).
 *   "Global rainfall erosivity assessment based on high-temporal resolution
 *   rainfall records." Scientific Reports 7, 4175.
 *   DOI: 10.1038/s41598-017-04282-8
 *   Distributed via the European Soil Data Centre (ESDAC),
 *   https://esdac.jrc.ec.europa.eu/content/global-rainfall-erosivity
 *
 * Output: public/sample-data/map-engine/erosivity-stations.geojson
 *   Each feature.properties:
 *     station_id — original FID
 *     r_factor   — R_FINAL (MJ · mm · ha⁻¹ · hr⁻¹ · yr⁻¹)
 *     source     — citation string
 *     license    — attribution note
 *
 * Run: pnpm exec tsx scripts/import-stations.ts
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as shapefile from 'shapefile';
import type { Feature, FeatureCollection, Point } from 'geojson';

const SHP = 'reference/NSFCOPES_BU/Rfactor-Stations.shp';
const DBF = SHP.replace('.shp', '.dbf');
const OUT_DIR = 'public/sample-data/map-engine';
const OUT_FILE = 'erosivity-stations.geojson';

const CITATION =
  'Panagos et al. (2017), Global Rainfall Erosivity Database (GloREDa). Sci Rep 7, 4175. DOI: 10.1038/s41598-017-04282-8. Via JRC-ESDAC.';
const LICENSE =
  'JRC-ESDAC reuse terms: free use with attribution. See https://esdac.jrc.ec.europa.eu/';

interface RawProps {
  FID: number;
  R_FINAL: number;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const src = await shapefile.open(SHP, DBF);
  const features: Feature<Point>[] = [];
  for (;;) {
    const { done, value } = await src.read();
    if (done) break;
    const f = value as Feature<Point, RawProps>;
    if (!f || !f.geometry || f.geometry.type !== 'Point') continue;
    const [rawLng, rawLat] = f.geometry.coordinates;
    // Upstream DBF has lng/lat swapped in some rows. Detect and normalize:
    // valid lat ∈ [-90, 90]; if the first coord is clearly a latitude and
    // the second is clearly a longitude, swap.
    let lng = rawLng;
    let lat = rawLat;
    if (Math.abs(rawLng) <= 90 && Math.abs(rawLat) > 90) {
      lng = rawLat;
      lat = rawLng;
    }
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        station_id: f.properties.FID,
        r_factor: Math.round(f.properties.R_FINAL * 100) / 100,
        source: CITATION,
        license: LICENSE,
      },
    });
  }

  const out: FeatureCollection<Point> = { type: 'FeatureCollection', features };
  writeFileSync(join(OUT_DIR, OUT_FILE), JSON.stringify(out));

  const rValues = features.map((f) => f.properties!.r_factor as number);
  const lngs = features.map((f) => (f.geometry as Point).coordinates[0]);
  const lats = features.map((f) => (f.geometry as Point).coordinates[1]);
  console.log(`wrote ${features.length} stations → ${OUT_DIR}/${OUT_FILE}`);
  console.log(
    `  r_factor: min ${Math.min(...rValues).toFixed(1)}, max ${Math.max(...rValues).toFixed(1)}, mean ${Math.round(rValues.reduce((a, b) => a + b, 0) / rValues.length)}`,
  );
  console.log(
    `  bbox lng [${Math.min(...lngs).toFixed(2)}, ${Math.max(...lngs).toFixed(2)}], lat [${Math.min(...lats).toFixed(2)}, ${Math.max(...lats).toFixed(2)}]`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
