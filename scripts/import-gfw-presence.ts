/**
 * Fetches Global Fishing Watch AIS vessel-presence data over the Belize
 * Exclusive Economic Zone (EEZ id 8457) for calendar-year 2024, monthly
 * temporal resolution, HIGH spatial resolution (~0.01°), grouped by FLAG.
 *
 * Dataset: `public-global-presence:latest`
 *   All AIS-broadcasting vessels (not just classified fishing vessels).
 *   Small-boat and non-AIS fleets (including Belize's coastal fishing fleet)
 *   are NOT represented. This is honest: the demo shows what GFW reveals.
 *
 * Endpoint: POST /v3/4wings/report
 * Docs: https://globalfishingwatch.org/our-apis/documentation
 *
 * Output: public/sample-data/map-engine/gfw-blz-presence-2024.geojson
 *   Each feature.properties:
 *     date      — "YYYY-MM"
 *     flag      — ISO-3 flag state (e.g., "USA", "MHL")
 *     hours     — AIS presence hours in that cell during that month
 *     vesselIDs — number of unique vessel IDs contributing
 *     source    — "gfw-presence-v4.0" (see README for full citation)
 *     license   — "CC-BY-4.0"
 *
 * License: Creative Commons BY 4.0 — attribute Global Fishing Watch.
 *   Source citation: Kroodsma, D.A. et al. (2018). "Tracking the global
 *   footprint of fisheries." Science 359, 904–908. DOI:10.1126/science.aao5646.
 *   Data via https://globalfishingwatch.org/our-apis/documentation
 *
 * Run: pnpm exec tsx scripts/import-gfw-presence.ts
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Feature, FeatureCollection, Point } from 'geojson';

const OUT_DIR = 'public/sample-data/map-engine';
const OUT_FILE = 'gfw-blz-presence-2024.geojson';
const BELIZE_EEZ_ID = 8457;
const DATE_RANGE = '2024-01-01,2024-12-31';

const GFW_ENDPOINT =
  'https://gateway.api.globalfishingwatch.org/v3/4wings/report' +
  '?spatial-resolution=HIGH' +
  '&temporal-resolution=MONTHLY' +
  '&group-by=FLAG' +
  '&datasets[0]=public-global-presence:latest' +
  `&date-range=${DATE_RANGE}` +
  '&format=JSON';

interface RawEntry {
  date: string;
  flag: string;
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
      flag: r.flag,
      hours: Math.round(r.hours * 100) / 100,
      vesselIDs: r.vesselIDs,
      source: 'gfw-presence-v4.0',
      license: 'CC-BY-4.0',
    },
  }));

  const out: FeatureCollection<Point> = {
    type: 'FeatureCollection',
    features,
  };
  writeFileSync(join(OUT_DIR, OUT_FILE), JSON.stringify(out));

  const byMonth: Record<string, number> = {};
  const byFlag: Record<string, number> = {};
  for (const r of rows) {
    byMonth[r.date] = (byMonth[r.date] || 0) + 1;
    byFlag[r.flag] = (byFlag[r.flag] || 0) + r.hours;
  }
  console.log(`wrote ${features.length} cell-months → ${OUT_DIR}/${OUT_FILE}`);
  console.log(`  months: ${Object.keys(byMonth).sort().join(', ')}`);
  const topFlags = Object.entries(byFlag)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([f, h]) => `${f}:${Math.round(h)}h`)
    .join(', ');
  console.log(`  top flags by hours: ${topFlags}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
