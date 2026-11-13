import { register } from './_register'
import type { DatasetSchema } from './_types'

const CLADE_PATTERN = /^Clade_(\d+)_pct$/

export const mimesPolygonDetail: DatasetSchema = {
  id: 'mimes-polygon-detail',
  family: 'mimes',
  schemaVersion: 1,

  classify(headerRow) {
    const required = ['Polygon_ID', 'BIN_ID', 'BIN_Label']
    if (!required.every((c) => headerRow.includes(c))) return false
    return headerRow.some((c) => CLADE_PATTERN.test(c))
  },

  incoming: {
    required: ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count'],
    optional: ['Area_Pct_of_Polygon', 'Mangrove_Pct_in_BIN'],
    patterns: [CLADE_PATTERN],
  },

  map(row) {
    const clades = Object.entries(row)
      .map(([k, v]) => {
        const match = k.match(CLADE_PATTERN)
        return match ? { clade: Number(match[1]), pct: Number(v) } : null
      })
      .filter((x): x is { clade: number; pct: number } => x !== null)
      .sort((a, b) => a.clade - b.clade)

    return {
      polygon_id: Number(row.Polygon_ID),
      bin_id: Number(row.BIN_ID),
      bin_label: String(row.BIN_Label),
      pixel_count: Number(row.Pixel_Count ?? 0),
      area_pct: Number(row.Area_Pct_of_Polygon ?? 0),
      mangrove_pct: Number(row.Mangrove_Pct_in_BIN ?? 0),
      clades,
    }
  },

  validators: {
    polygon_id: (v) => typeof v === 'number' && v > 0 && Number.isInteger(v),
    area_pct: (v) => typeof v === 'number' && v >= 0 && v <= 100,
  },
}

register(mimesPolygonDetail)
