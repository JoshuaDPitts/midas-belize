/**
 * REQ-CO-006: Coastal encoders
 * Color encoders for vulnerability, mangrove, and scenario-delta layers.
 *
 * Color semantics:
 *   Green  (safe):    [34, 197, 94, 220]
 *   Coral  (danger):  [251, 113, 133, 220]
 *   Amber  (low):     [251, 191, 36, 220]
 *   Gray   (missing): [120, 120, 120, 180]
 */

type RGBA = [number, number, number, number];
type Props = Record<string, unknown>;

const GREEN: RGBA = [34, 197, 94, 220];
const CORAL: RGBA = [251, 113, 133, 220];
const AMBER: RGBA = [251, 191, 36, 220];
const GRAY: RGBA = [120, 120, 120, 180];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function lerp(a: RGBA, b: RGBA, t: number): RGBA {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
    Math.round(a[3] + (b[3] - a[3]) * t),
  ];
}

/**
 * Vulnerability encoder: green at V=0, coral at V=1.
 * Input: { vulnerability: number } (0–1 scale)
 */
export function vulnerabilityEncoder(props: Props): RGBA {
  const v = props['vulnerability'];
  if (v === null || v === undefined || typeof v !== 'number' || isNaN(v)) {
    return [...GRAY] as RGBA;
  }
  const t = clamp(v, 0, 1);
  return lerp(GREEN, CORAL, t);
}

/**
 * Mangrove encoder: amber at coverage=0, green at coverage=100.
 * Input: { Mangrove_Pct_Total: number } (0–100 scale)
 */
export function mangroveEncoder(props: Props): RGBA {
  const pct = props['Mangrove_Pct_Total'];
  if (pct === null || pct === undefined || typeof pct !== 'number' || isNaN(pct)) {
    return [...GRAY] as RGBA;
  }
  const t = clamp(pct / 100, 0, 1);
  return lerp(AMBER, GREEN, t);
}

/**
 * Scenario-delta encoder:
 *   negative delta (improvement) → green
 *   positive delta (degradation) → coral
 *   zero / missing               → gray
 * Input: { delta: number }
 */
export function scenarioDeltaEncoder(props: Props): RGBA {
  const delta = props['delta'];
  if (delta === null || delta === undefined || typeof delta !== 'number' || isNaN(delta)) {
    return [...GRAY] as RGBA;
  }
  const magnitude = clamp(Math.abs(delta), 0, 1);
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
