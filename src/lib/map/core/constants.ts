// src/lib/map/core/constants.ts

/** [west, south, east, north] in EPSG:4326. */
export type Bbox = [number, number, number, number];
export type LngLat = [number, number];

// SiteId is canonically defined by the data layer (Firestore datasets are
// already tagged with these literals — see scripts/pre-process/sites.ts and
// the published catalog on midas-belize-prod). Re-exported here so map-engine
// callers don't need to know where the canonical lives.
export type { SiteId } from '@/lib/data/types';
import type { SiteId } from '@/lib/data/types';

export const BELIZE_BOUNDS: Bbox = [-89.25, 15.85, -87.3, 18.55];
export const BELIZE_CENTER: LngLat = [-88.45, 17.25];

export const SITE_BOUNDS: Record<SiteId, Bbox> = {
  // Tightened to the actual reef-polygon extent ([-88.2020,16.4370,-88.1914,16.4499])
  // plus a small margin, so the default view opens zoomed in on the reef
  // instead of a wide, mostly-empty box.
  'laughing-bird': [-88.206, 16.432, -88.187, 16.455],
  'placencia':     [-88.40, 16.48, -88.34, 16.56],
  'caye-caulker':  [-88.05, 17.72, -87.99, 17.78],
};

export const DEFAULT_ZOOM = 8;
export const MIN_ZOOM = 5;
export const MAX_ZOOM = 22;
export const DEFAULT_BEARING = 0;
export const DEFAULT_PITCH = 0;
