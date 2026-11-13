// Pure helpers backing the Laughing Bird coral-biomass playback controls
// and chart-click seeking. Kept dependency-free so they're trivially unit
// testable without mounting React.

/**
 * Nearest entry in a sorted-ascending `years` array to `target`. Ties break
 * toward the earlier (lower) year. Returns `null` for an empty array.
 */
export function nearestYear(years: number[], target: number): number | null {
  if (years.length === 0) return null;
  let best = years[0];
  let bestDist = Math.abs(years[0] - target);
  for (let i = 1; i < years.length; i++) {
    const dist = Math.abs(years[i] - target);
    if (dist < bestDist) {
      best = years[i];
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Next index for playback auto-advance, looping back to 0 once `current`
 * reaches the last index. `len <= 1` always yields 0 (nothing to advance
 * through — caller should disable playback in that case).
 */
export function nextYearIndex(current: number, len: number): number {
  if (len <= 1) return 0;
  return (current + 1) % len;
}
