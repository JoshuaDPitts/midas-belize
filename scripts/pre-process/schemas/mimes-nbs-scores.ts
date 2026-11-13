import { register } from './_register'
import type { DatasetSchema } from './_types'

const CLADE_PATTERN = /^Clade_\d+_pct$/
const SUB_SCORE_COLUMNS = [
  'Suitable_Elev_Pct',
  'Mangrove_Pct_in_Suitable',
  'Mangrove_Pct_Total',
  'Restoration_Potential',
  'Conservation_Value',
] as const

export const mimesNbsScores: DatasetSchema = {
  id: 'mimes-nbs-scores',
  family: 'mimes',
  schemaVersion: 1,

  classify(headerRow) {
    const required = ['Polygon_ID', 'Total_Pixels', 'NbS_Score']
    if (!required.every((c) => headerRow.includes(c))) return false
    const hasBin = headerRow.includes('BIN_ID')
    const hasClade = headerRow.some((c) => CLADE_PATTERN.test(c))
    return !(hasBin && hasClade)
  },

  incoming: {
    required: ['Polygon_ID', 'Total_Pixels', 'NbS_Score'],
    optional: [...SUB_SCORE_COLUMNS],
    patterns: [],
  },

  map(row) {
    const sub_scores: Record<string, number> = {}
    for (const column of SUB_SCORE_COLUMNS) {
      const value = row[column]
      if (value != null && value !== '') {
        sub_scores[column.toLowerCase()] = Number(value)
      }
    }
    return {
      polygon_id: Number(row.Polygon_ID),
      total_pixels: Number(row.Total_Pixels),
      nbs_score: Number(row.NbS_Score),
      sub_scores,
    }
  },

  validators: {
    nbs_score: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  },
}

register(mimesNbsScores)
