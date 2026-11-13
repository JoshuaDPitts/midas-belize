/** Categorical clade fill, keyed to the canonical 25-clade catalog. */
import { cladeRgb } from '@/lib/map/core/clades';

const HATCH_MARKER: [number, number, number, number] = [100, 100, 100, 100];
const CLADE_ALPHA = 180;

export function dominantCladeRgba(
  properties: Record<string, unknown>,
): [number, number, number, number] {
  let bestIdx: number | null = null;
  let bestPct = -1;
  for (let i = 1; i <= 25; i++) {
    const v = properties[`Clade_${i}_pct`];
    if (typeof v === 'number' && v > bestPct) {
      bestPct = v;
      bestIdx = i;
    }
  }
  return cladeIndexRgba(bestIdx);
}

/** 1-indexed (1..25). Returns the hatch marker when index is null/out-of-range. */
export function cladeIndexRgba(
  index: number | null,
): [number, number, number, number] {
  const rgb = cladeRgb(index);
  if (!rgb) return HATCH_MARKER;
  return [rgb[0], rgb[1], rgb[2], CLADE_ALPHA];
}
