import { describe, it, expect, beforeEach } from 'vitest'
import { clearSchemas, register, findSchemaById } from '@/../scripts/pre-process/schemas/_register'
import { rfactorMonthly, classifyByFilename } from '@/../scripts/pre-process/schemas/rfactor-monthly'

describe('rfactor-monthly schema', () => {
  beforeEach(() => {
    clearSchemas()
    register(rfactorMonthly)
  })

  it('is registered at schemaVersion 1 with family "rfactor-monthly"', () => {
    const s = findSchemaById('rfactor-monthly')
    expect(s?.schemaVersion).toBe(1)
    expect(s?.family).toBe('rfactor-monthly')
  })

  it('classify() always returns false (rasters carry no CSV header)', () => {
    expect(rfactorMonthly.classify([])).toBe(false)
    expect(rfactorMonthly.classify(['anything'])).toBe(false)
    expect(rfactorMonthly.classify(['Polygon_ID', 'Total_Pixels'])).toBe(false)
  })

  it('incoming spec is empty (classification is filename-driven)', () => {
    expect(rfactorMonthly.incoming).toEqual({ required: [], optional: [], patterns: [] })
  })

  it('classifyByFilename matches Rfactor_<Month>.tif for all 12 months', () => {
    const expected: Array<[string, number]> = [
      ['January', 1], ['February', 2], ['March', 3], ['April', 4],
      ['May', 5], ['June', 6], ['July', 7], ['August', 8],
      ['September', 9], ['October', 10], ['November', 11], ['December', 12],
    ]
    for (const [name, month] of expected) {
      expect(classifyByFilename(`Rfactor_${name}.tif`)).toEqual({ year: null, month })
    }
  })

  it('classifyByFilename accepts .tiff and is case-insensitive', () => {
    expect(classifyByFilename('Rfactor_December.TIFF')).toEqual({ year: null, month: 12 })
    expect(classifyByFilename('rfactor_january.tif')).toEqual({ year: null, month: 1 })
    expect(classifyByFilename('RFACTOR_JULY.TIF')).toEqual({ year: null, month: 7 })
  })

  it('classifyByFilename rejects unrelated or malformed names', () => {
    expect(classifyByFilename('unrelated.tif')).toBeNull()
    expect(classifyByFilename('Rfactor_Jan.tif')).toBeNull()       // abbreviation not allowed
    expect(classifyByFilename('Rfactor_13.tif')).toBeNull()        // numeric not allowed
    expect(classifyByFilename('Rfactor_.tif')).toBeNull()          // empty month name
    expect(classifyByFilename('Rfactor_January')).toBeNull()       // no extension
    expect(classifyByFilename('Rfactor_January.shp')).toBeNull()   // wrong extension
    expect(classifyByFilename('Pre_Rfactor_January.tif')).toBeNull() // must be prefix-anchored
    expect(classifyByFilename('Rfactor_Marchish.tif')).toBeNull()  // not a real month
  })

  it('map() identity-preserves raster metadata (COG bytes are served elsewhere)', () => {
    const metadata = { month: 3, year: 2017, band_count: 1, resolution_m: 1000 }
    expect(rfactorMonthly.map(metadata)).toEqual(metadata)
  })
})
