/**
 * Slope-length × slope-steepness (LS) factor for RUSLE, per McCool et al.
 * (1987, 1989) as published in Renard et al. (1997) RUSLE Handbook (AH-703)
 * Chapter 4. Units: dimensionless.
 *
 * Inputs:
 *   slopeLength_m — λ, slope length in meters from the runoff origin to
 *     the point where deposition begins or the runoff enters a channel.
 *     For zonal computations over a watershed polygon, this is typically
 *     derived from flow-accumulation on a DEM (see python/flow-acc.py).
 *   slopeRise_pct — slope steepness in percent rise (NOT degrees).
 *
 * Returns L * S as a single dimensionless factor.
 *
 * The decomposition:
 *   L = (λ / 22.13)^m
 *   m = β / (β + 1)
 *   β = (sin θ / 0.0896) / (3.0 · sin^0.8 θ + 0.56)
 *   where θ = slope angle in radians.
 *
 *   S = 10.8 sin θ + 0.03   if slope < 9% (~ 5.143°)
 *       16.8 sin θ − 0.50   if slope ≥ 9%
 */

export interface LSFactorInput {
  /** Slope length λ in meters (flow length from runoff origin). */
  slopeLength_m: number;
  /** Slope steepness in percent rise (rise/run × 100). */
  slopeRise_pct: number;
}

export function computeLS(input: LSFactorInput): number {
  const lambda = Math.max(0, input.slopeLength_m);
  const slopePct = Math.max(0, input.slopeRise_pct);
  if (lambda === 0 || slopePct === 0) return 0;

  const slopeRise = slopePct / 100;
  const theta = Math.atan(slopeRise); // radians
  const sinTheta = Math.sin(theta);

  // McCool 1987 m exponent
  const beta = (sinTheta / 0.0896) / (3.0 * Math.pow(sinTheta, 0.8) + 0.56);
  const m = beta / (beta + 1);

  const L = Math.pow(lambda / 22.13, m);
  const S = slopePct < 9 ? 10.8 * sinTheta + 0.03 : 16.8 * sinTheta - 0.50;

  return L * Math.max(0, S);
}

/** Convenience: compute LS in a vectorised loop, return area-weighted mean. */
export function meanLS(
  cells: { slopeLength_m: number; slopeRise_pct: number; area_m2: number }[],
): number {
  let weighted = 0;
  let totalArea = 0;
  for (const c of cells) {
    const a = Math.max(0, c.area_m2);
    if (a === 0) continue;
    weighted += computeLS(c) * a;
    totalArea += a;
  }
  return totalArea > 0 ? weighted / totalArea : 0;
}
