import { register } from './_register'
import type { DatasetSchema } from './_types'

/**
 * Per-watershed RUSLE soil-loss factors. One row per watershed polygon
 * (joined into the watershed polygon properties at render time via
 * findWatershedFeature in src/features/watershed/data/). Columns:
 *
 *   feature_id        — string, polygon id from the source polygons
 *   MIMES_ID          — number, present on placencia / cayecaulker
 *   Name              — string, present on placencia
 *   WATERSHED         — string, present on the national dataset
 *   mean_r_factor     — number, rainfall erosivity (R)
 *   K_factor          — number, soil erodibility (K, Wischmeier SI units)
 *   LS_factor         — number, slope-length x steepness (LS, dimensionless)
 *   C_factor          — number, cover management (C, dimensionless)
 *   P_factor          — number, support practice (P, dimensionless, =1)
 *   A_t_ha_yr         — number, annual soil loss (A = R * K * LS * C * P)
 *
 * Produced offline by scripts/pre-process/rusle/compute.ts; published as
 * placencia-watersheds-rusle-factors, cayecaulker-watersheds-rusle-factors,
 * belize-watersheds-rusle-factors.
 */

const REQUIRED = [
  'feature_id',
  'mean_r_factor',
  'K_factor',
  'LS_factor',
  'C_factor',
  'P_factor',
  'A_t_ha_yr',
] as const

const NUMERIC_COLS = [
  'mean_r_factor',
  'K_factor',
  'LS_factor',
  'C_factor',
  'P_factor',
  'A_t_ha_yr',
] as const

function asNumber(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export const rusleFactors: DatasetSchema = {
  id: 'rusle-factors',
  family: 'rusle-factors',
  schemaVersion: 1,

  classify(headerRow) {
    return REQUIRED.every((c) => headerRow.includes(c))
  },

  incoming: {
    required: [...REQUIRED],
    optional: ['MIMES_ID', 'Name', 'WATERSHED'],
    patterns: [],
  },

  map(row) {
    const out: Record<string, unknown> = {
      feature_id: row.feature_id ?? '',
    }
    // Identity columns: only emit if non-empty so the join lookup in
    // findWatershedFeature can match against any of Name/WATERSHED/MIMES_ID
    // without dragging through empty-string properties.
    if (row.MIMES_ID !== '' && row.MIMES_ID != null) {
      out.MIMES_ID = asNumber(row.MIMES_ID) ?? String(row.MIMES_ID)
    }
    if (row.Name) out.Name = String(row.Name)
    if (row.WATERSHED) out.WATERSHED = String(row.WATERSHED)
    for (const col of NUMERIC_COLS) {
      out[col] = asNumber(row[col])
    }
    return out
  },

  validators: {
    P_factor: (v) => v === null || (typeof v === 'number' && v >= 0 && v <= 1.5),
  },
}

register(rusleFactors)
