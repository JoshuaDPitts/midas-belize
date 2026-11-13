/**
 * Soil-erodibility (K) factor for RUSLE, computed from the Wischmeier &
 * Smith (1978) nomograph algebraic form. Units: t·ha·h·ha⁻¹·MJ⁻¹·mm⁻¹
 * (the SI form; US-customary K = SI K * 7.59).
 *
 * Reference: Wischmeier, W. H. & Smith, D. D. (1978). Predicting Rainfall
 * Erosion Losses: A Guide to Conservation Planning. USDA Agriculture
 * Handbook 537. The closed-form nomograph used here is from Renard et al.
 * (1997) RUSLE Handbook (AH-703) Appendix A, Eq. A-1, converted to SI per
 * Foster et al. (1981).
 *
 * The classical Wischmeier nomograph K (US units) is:
 *
 *   100·K = 2.1·M^1.14·1e-4·(12 - OM) + 3.25·(s - 2) + 2.5·(p - 3)
 *
 * where:
 *   M  = (silt% + very-fine-sand%) × (100 - clay%)
 *   OM = organic matter %
 *   s  = soil structure class (1..4)
 *   p  = permeability class (1..6)
 *
 * Then K_SI = K_US / 7.59. We expose a single `computeK(input)` that takes
 * texture fractions in percent (0..100) plus organic-matter percent plus the
 * two ordinal classes, and returns K in SI units.
 */

export type SoilStructure = 1 | 2 | 3 | 4;
export type SoilPermeability = 1 | 2 | 3 | 4 | 5 | 6;

export interface KFactorInput {
  /** Sand fraction, percent of mineral fines (0..100). */
  sand_pct: number;
  /** Silt fraction, percent of mineral fines (0..100). */
  silt_pct: number;
  /** Clay fraction, percent of mineral fines (0..100). */
  clay_pct: number;
  /**
   * Very-fine-sand fraction (0..100). Optional. SoilGrids does not publish
   * this directly; a common approximation is 30% of total sand for tropical
   * sandy loams. When omitted we fall back to `sand_pct * 0.3`.
   */
  vf_sand_pct?: number;
  /** Soil organic matter percent. SOC * 1.724 if you only have OC. */
  om_pct: number;
  /** Soil structure class (1 = very fine granular, 4 = blocky / massive). */
  structure: SoilStructure;
  /** Profile permeability class (1 = rapid, 6 = very slow). */
  permeability: SoilPermeability;
}

/** Wischmeier-Smith K in SI units (t·ha·h·ha⁻¹·MJ⁻¹·mm⁻¹). */
export function computeK(input: KFactorInput): number {
  const sand = clampPct(input.sand_pct);
  const silt = clampPct(input.silt_pct);
  const clay = clampPct(input.clay_pct);
  const vfSand = clampPct(input.vf_sand_pct ?? sand * 0.3);
  const om = Math.max(0, Math.min(12, input.om_pct));
  const s = input.structure;
  const p = input.permeability;

  // M = (silt% + very-fine-sand%) × (100 - clay%)
  const M = (silt + vfSand) * (100 - clay);

  // 100·K (US units) = 2.1·M^1.14·1e-4·(12 - OM) + 3.25·(s - 2) + 2.5·(p - 3)
  const kUsTimes100 =
    2.1 * Math.pow(M, 1.14) * 1e-4 * (12 - om) + 3.25 * (s - 2) + 2.5 * (p - 3);

  const kUs = kUsTimes100 / 100;

  // SI conversion factor per Foster et al. 1981: K_SI = K_US / 7.59
  const kSi = kUs / 7.59;

  // K is physically bounded ~0.0 .. 0.10 SI; clamp negatives that emerge for
  // very low-M soils with high organic matter (where the formula goes
  // slightly below zero) to 0.
  return Math.max(0, kSi);
}

function clampPct(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, v));
}

/**
 * Heuristic permeability class from texture, used when SoilGrids does not
 * publish a permeability layer. USDA NRCS texture-to-permeability bins.
 */
export function permeabilityFromTexture(
  sand_pct: number,
  clay_pct: number,
): SoilPermeability {
  if (sand_pct >= 85) return 1; // sand: rapid
  if (sand_pct >= 70 && clay_pct < 15) return 2; // loamy sand: moderately rapid
  if (clay_pct >= 60) return 6; // heavy clay: very slow
  if (clay_pct >= 40) return 5; // clay: slow
  if (clay_pct >= 27) return 4; // clay loam: moderately slow
  if (sand_pct >= 50) return 2; // sandy loam: moderately rapid
  return 3; // loam / silt loam: moderate
}

/**
 * Heuristic structure class from SOC (organic carbon %). Higher SOC ->
 * better aggregation -> smaller (1..2). Used when SoilGrids does not
 * publish a structure layer directly. Bins per Wischmeier & Smith 1978 Tab. 4.
 */
export function structureFromSoc(soc_pct: number): SoilStructure {
  if (!Number.isFinite(soc_pct) || soc_pct <= 0) return 4;
  if (soc_pct >= 4) return 1;
  if (soc_pct >= 2) return 2;
  if (soc_pct >= 1) return 3;
  return 4;
}
