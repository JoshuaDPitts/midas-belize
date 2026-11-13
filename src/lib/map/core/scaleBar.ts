// src/lib/map/core/scaleBar.ts
// Pure math for ME-012 scale bar. Web Mercator ground resolution +
// nice-number rounding so the bar always lands on a readable distance.

/** Web Mercator meters-per-pixel at a given latitude + zoom level. */
export function metersPerPixel(lat: number, zoom: number): number {
  const EARTH_CIRCUMFERENCE_M = 40075016.686;
  return (EARTH_CIRCUMFERENCE_M * Math.cos((lat * Math.PI) / 180)) / Math.pow(2, zoom + 8);
}

/** Candidate "nice" distances in meters, low → high. */
const NICE_STEPS_M = [
  1, 2, 5,
  10, 20, 50,
  100, 200, 500,
  1_000, 2_000, 5_000,
  10_000, 20_000, 50_000,
  100_000, 200_000, 500_000,
  1_000_000, 2_000_000, 5_000_000,
];

/** Pick the largest nice step ≤ `maxMeters`. */
export function chooseNiceDistance(maxMeters: number): number {
  if (!Number.isFinite(maxMeters) || maxMeters <= 0) return 0;
  let best = NICE_STEPS_M[0];
  for (const n of NICE_STEPS_M) {
    if (n <= maxMeters) best = n;
    else break;
  }
  return best;
}

/** Given a target bar length in pixels + viewport context, return the
 *  meters the bar should represent and its resulting pixel width (≤ target). */
export function computeScaleBar(
  lat: number,
  zoom: number,
  targetPx: number,
): { meters: number; widthPx: number; label: string } {
  const mpp = metersPerPixel(lat, zoom);
  if (!Number.isFinite(mpp) || mpp <= 0) return { meters: 0, widthPx: 0, label: '—' };
  const meters = chooseNiceDistance(targetPx * mpp);
  const widthPx = meters / mpp;
  return { meters, widthPx, label: formatDistance(meters) };
}

/** Human-friendly distance label: m up to 999, km above. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '—';
  if (meters < 1000) return `${meters} m`;
  const km = meters / 1000;
  if (km >= 100) return `${km.toFixed(0)} km`;
  if (km >= 10) return `${km.toFixed(0)} km`;
  return `${km.toFixed(0)} km`;
}
