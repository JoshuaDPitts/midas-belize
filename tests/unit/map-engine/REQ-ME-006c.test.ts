/**
 * REQ-ME-006c — Global Fishing Watch Flow sub-batch (T14).
 *
 * Validates the two GFW-derived GeoJSON datasets shipped under
 * public/sample-data/map-engine/. These feed the "Fishing (GFW)" tab in
 * SectionME006; regressions in the data (malformed structure, missing
 * provenance, wrong bbox) would silently break the demo.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { FeatureCollection, Point } from 'geojson';

const DATA_DIR = join(process.cwd(), 'public/sample-data/map-engine');

function load<P>(file: string): FeatureCollection<Point, P> {
  return JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
}

// Belize EEZ bounding box, padded. Any coord outside this is a red flag —
// the upstream API returning global data instead of region-filtered data
// would be caught here.
const BLZ_BBOX = { west: -89.5, east: -85.5, south: 15.5, north: 18.5 };

interface PresenceProps {
  date: string;
  flag: string;
  hours: number;
  vesselIDs: number;
  source: string;
  license: string;
}

interface FishingProps {
  date: string;
  geartype: string;
  hours: number;
  vesselIDs: number;
  source: string;
  license: string;
}

describe('REQ-ME-006c GFW presence dataset', () => {
  const fc = load<PresenceProps>('gfw-blz-presence-2024.geojson');

  it('is a non-empty FeatureCollection of Points', () => {
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features.length).toBeGreaterThan(10_000);
    expect(fc.features[0]?.geometry.type).toBe('Point');
  });

  it('covers all 12 months of 2024', () => {
    const months = new Set(fc.features.map((f) => f.properties!.date));
    const expected = Array.from({ length: 12 }, (_, i) =>
      `2024-${String(i + 1).padStart(2, '0')}`,
    );
    for (const m of expected) expect(months.has(m)).toBe(true);
  });

  it('keeps every feature inside the Belize EEZ bbox', () => {
    for (const f of fc.features) {
      const [lng, lat] = f.geometry.coordinates;
      expect(lng).toBeGreaterThanOrEqual(BLZ_BBOX.west);
      expect(lng).toBeLessThanOrEqual(BLZ_BBOX.east);
      expect(lat).toBeGreaterThanOrEqual(BLZ_BBOX.south);
      expect(lat).toBeLessThanOrEqual(BLZ_BBOX.north);
    }
  });

  it('stamps every feature with GFW provenance + CC-BY-4.0', () => {
    for (const f of fc.features) {
      expect(f.properties?.source).toBe('gfw-presence-v4.0');
      expect(f.properties?.license).toBe('CC-BY-4.0');
    }
  });
});

describe('REQ-ME-006c GFW fishing-effort dataset', () => {
  const fc = load<FishingProps>('gfw-blz-fishing-2020.geojson');

  it('contains only 2020 entries', () => {
    expect(fc.features.length).toBeGreaterThan(0);
    for (const f of fc.features) expect(f.properties?.date).toBe('2020');
  });

  it('stamps every feature with GFW provenance + CC-BY-4.0', () => {
    for (const f of fc.features) {
      expect(f.properties?.source).toBe('gfw-fishing-v4.0');
      expect(f.properties?.license).toBe('CC-BY-4.0');
    }
  });
});
