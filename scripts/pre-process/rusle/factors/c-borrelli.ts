/**
 * Cover-management (C) factor for RUSLE, looked up from ESA WorldCover
 * v200 (2021) class codes per the Borrelli et al. (2017) global soil-erosion
 * lookup table (Nature Communications 8:2013, Table S2). Units: dimensionless.
 *
 * Reference:
 *   Borrelli, P., Robinson, D. A., Fleischer, L. R., et al. (2017).
 *   An assessment of the global impact of 21st century land use change on
 *   soil erosion. Nature Communications 8, 2013.
 *   https://doi.org/10.1038/s41467-017-02142-7
 *
 * ESA WorldCover class codes per the
 * https://esa-worldcover.org/en/data-access spec sheet.
 *
 * Borrelli's lookup is defined over Land-Cover-CCI / Copernicus classes;
 * the values here are mapped onto WorldCover's coarser 11-class legend.
 * Where multiple Borrelli classes collapse to one WorldCover class, the
 * area-weighted Borrelli mean is used (e.g. WorldCover Cropland = 0.20,
 * an aggregate of irrigated 0.12, rainfed 0.21, mosaic 0.25 from Borrelli
 * Tab. S2 rows 11, 12, 14, 20, 30). All values are content-review-pending.
 */

/** ESA WorldCover v200 class codes. */
export const WORLDCOVER_CLASSES = {
  TREE_COVER: 10,
  SHRUBLAND: 20,
  GRASSLAND: 30,
  CROPLAND: 40,
  BUILT_UP: 50,
  BARE_SPARSE: 60,
  SNOW_ICE: 70,
  WATER: 80,
  HERBACEOUS_WETLAND: 90,
  MANGROVE: 95,
  MOSS_LICHEN: 100,
} as const;

export type WorldCoverClass =
  (typeof WORLDCOVER_CLASSES)[keyof typeof WORLDCOVER_CLASSES];

/** C factor per WorldCover class. Higher = more erosion under the cover. */
const C_BY_CLASS: Record<number, number> = {
  10: 0.003, // tree cover (closed-canopy forest)
  20: 0.05, // shrubland
  30: 0.05, // grassland
  40: 0.2, // cropland (area-weighted mean of rainfed + irrigated)
  50: 0.0, // built-up (impervious; no soil loss)
  60: 0.5, // bare / sparse vegetation
  70: 0.0, // snow / ice
  80: 0.0, // permanent water bodies
  90: 0.01, // herbaceous wetland (low erosion, anchored soils)
  95: 0.003, // mangrove (closed-canopy intertidal forest)
  100: 0.1, // moss / lichen (Arctic; never relevant for Belize)
};

/** Returns the C-factor for a single WorldCover class code; null if unknown. */
export function cFromWorldCoverClass(classCode: number): number | null {
  const v = C_BY_CLASS[classCode];
  return typeof v === 'number' ? v : null;
}

/**
 * Area-weighted C-factor for a polygon, given a histogram of WorldCover
 * class fractions (must sum to ~1.0, but the function normalises).
 * Unknown classes contribute 0 and are excluded from the denominator.
 */
export function cFromClassFractions(
  fractions: Record<number, number>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [codeStr, fraction] of Object.entries(fractions)) {
    if (!Number.isFinite(fraction) || fraction <= 0) continue;
    const code = Number(codeStr);
    const c = cFromWorldCoverClass(code);
    if (c === null) continue;
    weightedSum += c * fraction;
    totalWeight += fraction;
  }
  if (totalWeight <= 0) return 0;
  return weightedSum / totalWeight;
}
