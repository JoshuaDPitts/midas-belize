/** Continuous sequential ramp for coral biomass: pale (low) → saturated teal/green (high). */
const HATCH_MARKER: [number, number, number, number] = [100, 100, 100, 100];

const LOW_END: [number, number, number] = [225, 240, 230];
const HIGH_END: [number, number, number] = [16, 130, 96];

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export function biomassToRgba(
  value: number | null | undefined,
  max: number,
): [number, number, number, number] {
  if (value === null || value === undefined || Number.isNaN(value)) return HATCH_MARKER;
  const span = max || 1;
  const t = clamp01(value / span);
  return [
    lerp(LOW_END[0], HIGH_END[0], t),
    lerp(LOW_END[1], HIGH_END[1], t),
    lerp(LOW_END[2], HIGH_END[2], t),
    200,
  ];
}
