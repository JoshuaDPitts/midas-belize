import { describe, it, expect, beforeEach } from 'vitest'
import {
  clearSchemas,
  register,
  classifyByHeader,
  findSchemaById,
} from '@/../scripts/pre-process/schemas/_register'
import { mimesPolygonDetail } from '@/../scripts/pre-process/schemas/mimes-polygon-detail'

describe('mimes-polygon-detail schema', () => {
  beforeEach(() => {
    clearSchemas()
    register(mimesPolygonDetail)
  })

  it('is registered at schemaVersion 1 in family "mimes"', () => {
    const s = findSchemaById('mimes-polygon-detail')
    expect(s?.schemaVersion).toBe(1)
    expect(s?.family).toBe('mimes')
  })

  it('classify() matches Pl_30_Polygons_ebin_clade_detail headers', () => {
    const headers = [
      'Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count', 'Area_Pct_of_Polygon',
      'Mangrove_Pct_in_BIN',
      'Clade_1_pct', 'Clade_2_pct', 'Clade_3_pct', 'Clade_4_pct', 'Clade_5_pct',
      'Clade_6_pct', 'Clade_7_pct', 'Clade_8_pct', 'Clade_9_pct', 'Clade_10_pct',
      'Clade_11_pct', 'Clade_12_pct', 'Clade_13_pct', 'Clade_14_pct', 'Clade_15_pct',
      'Clade_16_pct', 'Clade_17_pct', 'Clade_18_pct', 'Clade_19_pct', 'Clade_20_pct',
      'Clade_21_pct', 'Clade_22_pct', 'Clade_23_pct', 'Clade_24_pct', 'Clade_25_pct',
    ]
    expect(classifyByHeader(headers)?.id).toBe('mimes-polygon-detail')
  })

  it('does not classify unrelated CSV headers', () => {
    expect(classifyByHeader(['x', 'y', 'z'])).toBeNull()
    expect(classifyByHeader(['Polygon_ID'])).toBeNull()
    expect(classifyByHeader(['Polygon_ID', 'BIN_ID', 'BIN_Label'])).toBeNull()
  })

  it('map() produces the canonical shape', () => {
    const row = {
      Polygon_ID: '18', BIN_ID: '1', BIN_Label: '-30 to -20m',
      Pixel_Count: '42', Area_Pct_of_Polygon: '1.5', Mangrove_Pct_in_BIN: '0.1',
      Clade_1_pct: '10', Clade_2_pct: '0', Clade_3_pct: '5',
    }
    expect(mimesPolygonDetail.map(row)).toEqual({
      polygon_id: 18, bin_id: 1, bin_label: '-30 to -20m',
      pixel_count: 42, area_pct: 1.5, mangrove_pct: 0.1,
      clades: [
        { clade: 1, pct: 10 },
        { clade: 2, pct: 0 },
        { clade: 3, pct: 5 },
      ],
    })
  })

  it('map() handles missing optional columns with zeros', () => {
    const row = {
      Polygon_ID: '1', BIN_ID: '1', BIN_Label: 'x', Pixel_Count: '0',
      Clade_1_pct: '50',
    }
    const canonical = mimesPolygonDetail.map(row) as {
      area_pct: number
      mangrove_pct: number
      clades: Array<{ clade: number; pct: number }>
    }
    expect(canonical.area_pct).toBe(0)
    expect(canonical.mangrove_pct).toBe(0)
    expect(canonical.clades).toEqual([{ clade: 1, pct: 50 }])
  })

  it('map() sorts clades numerically (not lexicographically) by clade index', () => {
    const row = {
      Polygon_ID: '1', BIN_ID: '1', BIN_Label: 'x', Pixel_Count: '0',
      Clade_10_pct: '10', Clade_2_pct: '2', Clade_1_pct: '1',
    }
    const canonical = mimesPolygonDetail.map(row) as {
      clades: Array<{ clade: number; pct: number }>
    }
    expect(canonical.clades.map((c) => c.clade)).toEqual([1, 2, 10])
  })

  it('incoming.patterns matches Clade_N_pct for arbitrary N', () => {
    const pat = mimesPolygonDetail.incoming.patterns[0]
    expect(pat.test('Clade_1_pct')).toBe(true)
    expect(pat.test('Clade_26_pct')).toBe(true)
    expect(pat.test('Clade_100_pct')).toBe(true)
    expect(pat.test('Clade_pct')).toBe(false)
    expect(pat.test('clade_1_pct')).toBe(false)
  })
})
