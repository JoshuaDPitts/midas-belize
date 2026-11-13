import type {
  NbsRankFactor,
  PerFactorContribution,
  RankedPolygon,
  WatershedPolygonContext,
} from './_types';

interface ZStats {
  mean: number;
  stdev: number;
}

function zStatsFor(values: (number | null)[]): ZStats {
  const valid = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) return { mean: 0, stdev: 1 };
  const mean = valid.reduce((s, v) => s + v, 0) / valid.length;
  const variance =
    valid.length > 1
      ? valid.reduce((s, v) => s + (v - mean) ** 2, 0) / valid.length
      : 0;
  const stdev = Math.sqrt(variance);
  // Single-value or all-equal sets give stdev=0; fall back to 1 so the
  // z-score collapses to 0 (every polygon scores identically on that factor).
  return { mean, stdev: stdev === 0 ? 1 : stdev };
}

/** Compute a composite NbS rank across the polygons + factors.
 *
 * - Raw values are inverted for `lower-better` factors before z-scoring.
 * - Each factor's values are z-scored across the polygon set; null raw
 *   stays null so the polygon doesn't get credit (or debit) for missing
 *   data on that factor.
 * - The composite score is the sum of `z × weight` across all factors,
 *   skipping null cells.
 * - Result is sorted by composite score descending, stable on ties via
 *   the polygon's original index. */
export function computeRanking<P = WatershedPolygonContext>(
  polygons: P[],
  factors: NbsRankFactor<P>[],
  weights: Record<string, number>,
): RankedPolygon<P>[] {
  // Step 1: per-factor raw values with direction-inversion applied.
  const rawByFactor = new Map<string, (number | null)[]>();
  for (const factor of factors) {
    const sign = factor.direction === 'lower-better' ? -1 : 1;
    const values = polygons.map((p) => {
      const v = factor.compute(p);
      if (typeof v !== 'number' || !Number.isFinite(v)) return null;
      return sign * v;
    });
    rawByFactor.set(factor.id, values);
  }

  // Step 2: z-scores per factor.
  const zByFactor = new Map<string, (number | null)[]>();
  for (const [id, values] of rawByFactor) {
    const { mean, stdev } = zStatsFor(values);
    zByFactor.set(
      id,
      values.map((v) => (v === null ? null : (v - mean) / stdev)),
    );
  }

  // Step 3: weighted sum per polygon.
  const ranked: RankedPolygon<P>[] = polygons.map((polygon, i) => {
    const perFactor: PerFactorContribution[] = factors.map((factor) => {
      const raw = rawByFactor.get(factor.id)![i] ?? null;
      const z = zByFactor.get(factor.id)![i] ?? null;
      // Use the registered direction's pre-inversion raw for display in
      // perFactor (un-invert if lower-better, since UI shows the actual
      // metric value, not its sign-flipped twin).
      const displayRaw = raw === null
        ? null
        : factor.direction === 'lower-better' ? -raw : raw;
      const weight = weights[factor.id] ?? factor.defaultWeight;
      const weightedZ = z === null ? 0 : z * weight;
      return {
        factorId: factor.id,
        rawValue: displayRaw,
        zScore: z,
        weight,
        weightedZ,
      };
    });
    const score = perFactor.reduce((s, c) => s + c.weightedZ, 0);
    return { polygon, score, perFactor };
  });

  // Step 4: sort descending. Stable sort on the original array is
  // preserved by V8 when keys are equal, so tied polygons stay in their
  // input order.
  return ranked.sort((a, b) => b.score - a.score);
}
