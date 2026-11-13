/**
 * Fetches Global Fishing Watch classified fishing-effort data over the
 * Belize EEZ (id 8457) for calendar-year 2020, yearly temporal resolution,
 * HIGH spatial resolution, grouped by GEARTYPE.
 *
 * Dataset: `public-global-fishing-effort:latest`
 *   Only vessels GFW's ML classifier identifies as "fishing" — much sparser
 *   than the presence dataset. 2020 is the most recent year with non-null
 *   Belize EEZ data; 2023/2024 return null.
 *
 * Endpoint: POST /v3/4wings/report
 * Docs: https://globalfishingwatch.org/our-apis/documentation
 *
 * Output: public/sample-data/map-engine/gfw-blz-fishing-2020.geojson
 *   Each feature.properties:
 *     date      — "2020"
 *     geartype  — gear classification (e.g., "inconclusive", "trawlers")
 *     hours     — classified fishing hours in that cell
 *     vesselIDs — number of unique vessel IDs contributing
 *     source    — "gfw-fishing-v4.0" (see README for full citation)
 *     license   — "CC-BY-4.0"
 *
 * License: Creative Commons BY 4.0 — attribute Global Fishing Watch.
 *   Kroodsma, D.A. et al. (2018). "Tracking the global footprint of
 *   fisheries." Science 359, 904–908. DOI:10.1126/science.aao5646.
 *
 * Run: pnpm exec tsx scripts/import-gfw-fishing.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Feature, FeatureCollection, Point } from 'geojson';

const OUT_DIR = 'public/sample-data/map-engine';
const OUT_FILE = 'gfw-blz-fishing-2020.geojson';
const BELIZE_EEZ_ID = 8457;
const DATE_RANGE = '2020-01-01,2020-12-31';

const GFW_ENDPOINT =
  'https://gateway.api.globalfishingwatch.org/v3/4wings/report' +
  '?spatial-resolution=HIGH' +
  '&temporal-resolution=YEARLY' +
  '&group-by=GEARTYPE' +
  '&datasets[0]=public-global-fishing-effort:latest' +
  `&date-range=${DATE_RANGE}` +
  '&format=JSON';

interface RawEntry {
  date: string;
  geartype: string;
  hours: number;
  lat: number;
  lon: number;
  vesselIDs: number;
}

function loadEnv(): void {
  try {
    const envFile = readFileSync('.env.local', 'utf8');
    for (const line of envFile.split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
      }
    }
  } catch {
    /* .env.local missing — rely on shell exports */
  }
}

async function main() {
  loadEnv();
  const token = process.env.GFW_API_TOKEN;
  if (!token) {
    throw new Error('GFW_API_TOKEN not set (.env.local or shell export)');
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const res = await fetch(GFW_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      region: { dataset: 'public-eez-areas', id: BELIZE_EEZ_ID },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GFW ${res.status}: ${text.slice(0, 400)}`);
  }

  const payload = (await res.json()) as {
    entries: Array<Record<string, RawEntry[] | null>>;
  };
  const entries = payload.entries?.[0];
  const datasetKey = entries ? Object.keys(entries)[0] : undefined;
  const rows = (datasetKey && entries?.[datasetKey]) || [];
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error('GFW returned no entries — dataset may be unavailable');
  }

  const features: Feature<Point>[] = rows.map((r) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [r.lon, r.lat] },
    properties: {
      date: r.date,
      geartype: r.geartype,
      hours: Math.round(r.hours * 100) / 100,
      vesselIDs: r.vesselIDs,
      source: 'gfw-fishing-v4.0',
      license: 'CC-BY-4.0',
    },
  }));

  const out: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features,
  };
  writeFileSync(join(OUT_DIR, OUT_FILE), JSON.stringify(out));

  const byGear: Record<string, number> = {};
  for (const r of rows) byGear[r.geartype] = (byGear[r.geartype] || 0) + r.hours;
  console.log(`wrote ${features.length} cells → ${OUT_DIR}/${OUT_FILE}`);
  console.log(
    `  by geartype: ${Object.entries(byGear)
      .sort((a, b) => b[1] - a[1])
      .map(([g, h]) => `${g}:${Math.round(h * 10) / 10}h`)
      .join(', ')}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
