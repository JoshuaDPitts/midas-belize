import type { ScoreRange } from './nbsColorScale';

const HATCH_MARKER: [number, number, number, number] = [100, 100, 100, 100];

const LOW_END: [number, number, number] = [180, 180, 180];
const HIGH_END: [number, number, number] = [240, 192, 64];

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}
function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function restorationToRgba(
  score: number | null | undefined,
  range: ScoreRange,
): [number, number, number, number] {
  if (score === null || score === undefined || Number.isNaN(score)) return HATCH_MARKER;
  const span = range.max - range.min || 1;
  const t = clamp01((score - range.min) / span);
  return [
    lerp(LOW_END[0], HIGH_END[0], t),
    lerp(LOW_END[1], HIGH_END[1], t),
    lerp(LOW_END[2], HIGH_END[2], t),
    180,
  ];
}
