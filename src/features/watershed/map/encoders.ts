import { cladeRgb } from '@/lib/map/core/clades';

export type RGBA = [number, number, number, number];

const MUTED: RGBA = [120, 120, 120, 180];

export function nbsEncoder(props: Record<string, unknown>): RGBA {
  const raw = props.NbS_Score;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return MUTED;
  const clamped = Math.max(-1, Math.min(1, raw));
  if (clamped >= 0) {
    const g = Math.round(140 + 80 * clamped);
    return [40, g, 80, 200];
  }
  const r = Math.round(180 + 60 * Math.abs(clamped));
  return [r, 80, 60, 200];
}

/**
 * RUSLE-flavoured erosion-risk score. When K and LS factors are joined onto
 * the polygon, returns R*K*LS. When they are missing (most national-scale
 * watersheds before the RUSLE join lands), falls back to R*area_km2 so the
 * relative ranking still tracks rainfall energy weighted by catchment size.
 * Missing R is treated as 0; missing area as 1.
 */
export function computeErosionRiskScore(props: Record<string, unknown>): number {
  const R = typeof props.mean_r_factor === 'number' && Number.isFinite(props.mean_r_factor) ? props.mean_r_factor : 0;
  const K = typeof props.K_factor === 'number' && Number.isFinite(props.K_factor) ? props.K_factor : null;
  const LS = typeof props.LS_factor === 'number' && Number.isFinite(props.LS_factor) ? props.LS_factor : null;
  const area = typeof props.area_km2 === 'number' && Number.isFinite(props.area_km2) ? props.area_km2 : 1;
  if (K !== null && LS !== null) return R * K * LS;
  return R * area;
}

/** Sequential light-yellow (low risk) to deep-coral (high risk) ramp, normalized at 5000. */
export function erosionRiskEncoder(props: Record<string, unknown>): RGBA {
  const score = computeErosionRiskScore(props);
  const norm = Math.max(0, Math.min(1, score / 5000));
  return [
    Math.round(255 - 55 * norm),
    Math.round(235 - 195 * norm),
    Math.round(150 - 110 * norm),
    200,
  ];
}

/**
 * Cyan (0,188,212) at restoration=0 to amber (255,193,7) at restoration=1.
 * Clamps inputs to 0..1 and falls back to muted gray when the value is missing
 * or non-numeric.
 */
export function restorationEncoder(props: Record<string, unknown>): RGBA {
  const raw = props.Restoration_Potential;
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return MUTED;
  const c = Math.max(0, Math.min(1, raw));
  return [
    Math.round(255 * c),
    Math.round(188 + 5 * c),
    Math.round(212 - 205 * c),
    200,
  ];
}

const CLADE_ALPHA = 200;

/** 1-indexed clade (1..25). Returns muted gray when index is null or out of range. */
export function cladeIndexRgba(index: number | null): RGBA {
  const rgb = cladeRgb(index);
  if (!rgb) return MUTED;
  return [rgb[0], rgb[1], rgb[2], CLADE_ALPHA];
}

// Color constants for scenario delta encoder
const GRAY: RGBA = [160, 160, 160, 200];
const GREEN: RGBA = [76, 175, 80, 255];   // improvement
const CORAL: RGBA = [255, 112, 67, 255];  // degradation

/**
 * Scenario-delta encoder:
 *   negative delta (improvement) → green
 *   positive delta (degradation) → coral
 *   zero / missing               → gray
 * Input: { delta: number }
 */
export function scenarioDeltaEncoder(props: Record<string, unknown>): RGBA {
  const delta = props['delta'];
  if (delta === null || delta === undefined || typeof delta !== 'number' || isNaN(delta)) {
    return [...GRAY] as RGBA;
  }
  
  // Helper to interpolate between two colors
  const lerp = (a: RGBA, b: RGBA, t: number): RGBA => [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];

  const magnitude = Math.max(0, Math.min(1, Math.abs(delta)));
  
  if (delta < 0) {
    // improvement: interpolate gray → green
    return lerp(GRAY, GREEN, magnitude);
  } else if (delta > 0) {
    // degradation: interpolate gray → coral
    return lerp(GRAY, CORAL, magnitude);
  }
  
  // zero
  return [...GRAY] as RGBA;
}
