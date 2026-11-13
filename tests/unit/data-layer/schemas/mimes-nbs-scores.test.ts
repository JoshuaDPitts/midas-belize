import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearSchemas,
  register,
  classifyByHeader,
  findSchemaById,
} from '@/../scripts/pre-process/schemas/_register'
import { mimesNbsScores } from '@/../scripts/pre-process/schemas/mimes-nbs-scores'
import { mimesPolygonDetail } from '@/../scripts/pre-process/schemas/mimes-polygon-detail'

describe('mimes-nbs-scores schema', () => {
  beforeEach(() => {
    clearSchemas()
    register(mimesNbsScores)
  })

  it('is registered at schemaVersion 1 in family "mimes"', () => {
    const s = findSchemaById('mimes-nbs-scores')
    expect(s?.schemaVersion).toBe(1)
    expect(s?.family).toBe('mimes')
  })

  it('classifies Pl_30_Polygons_nbs_scores headers', () => {
    const headers = [
      'Polygon_ID', 'Total_Pixels',
      'Suitable_Elev_Pct', 'Mangrove_Pct_in_Suitable', 'Mangrove_Pct_Total',
      'Restoration_Potential', 'Conservation_Value', 'NbS_Score',
    ]
    expect(classifyByHeader(headers)?.id).toBe('mimes-nbs-scores')
  })

  it('does not classify clade-detail headers (collision guard)', () => {
    const detailHeaders = ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count', 'Clade_1_pct']
    expect(classifyByHeader(detailHeaders)).toBeNull()
  })

  it('does not classify when required columns are missing', () => {
    expect(classifyByHeader(['Polygon_ID', 'Total_Pixels'])).toBeNull()
    expect(classifyByHeader(['Polygon_ID', 'NbS_Score'])).toBeNull()
    expect(classifyByHeader(['Total_Pixels', 'NbS_Score'])).toBeNull()
  })

  it('does not claim rows that also have BIN_ID + Clade_N (belt-and-suspenders collision guard)', () => {
    const mixedHeaders = [
      'Polygon_ID', 'Total_Pixels', 'NbS_Score',
      'BIN_ID', 'BIN_Label', 'Clade_1_pct',
    ]
    expect(mimesNbsScores.classify(mixedHeaders)).toBe(false)
  })

  it('map() produces canonical shape with lowercased sub_scores keys', () => {
    const row = {
      Polygon_ID: '13', Total_Pixels: '6813',
      Suitable_Elev_Pct: '58.15', Mangrove_Pct_in_Suitable: '1.49',
      Mangrove_Pct_Total: '19.52', Restoration_Potential: '0.5729',
      Conservation_Value: '0.1952', NbS_Score: '0.7681',
    }
    expect(mimesNbsScores.map(row)).toEqual({
      polygon_id: 13,
      total_pixels: 6813,
      nbs_score: 0.7681,
      sub_scores: {
        suitable_elev_pct: 58.15,
        mangrove_pct_in_suitable: 1.49,
        mangrove_pct_total: 19.52,
        restoration_potential: 0.5729,
        conservation_value: 0.1952,
      },
    })
  })

  it('map() omits missing optional sub_score columns', () => {
    const row = {
      Polygon_ID: '1', Total_Pixels: '100', NbS_Score: '0.5',
      Suitable_Elev_Pct: '50',
    }
    const canonical = mimesNbsScores.map(row) as {
      sub_scores: Record<string, number>
    }
    expect(canonical.sub_scores).toEqual({ suitable_elev_pct: 50 })
  })

  it('co-registered with polygon-detail: nbs headers still classify as nbs, detail headers as detail', () => {
    register(mimesPolygonDetail)
    const nbsHeaders = ['Polygon_ID', 'Total_Pixels', 'NbS_Score']
    const detailHeaders = ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Clade_1_pct']
    expect(classifyByHeader(nbsHeaders)?.id).toBe('mimes-nbs-scores')
    expect(classifyByHeader(detailHeaders)?.id).toBe('mimes-polygon-detail')
  })
})
