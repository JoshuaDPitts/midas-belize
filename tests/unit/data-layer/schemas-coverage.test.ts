import { describe, it, expect, beforeAll } from 'vitest'
import { getSchemas } from '@/../scripts/pre-process/schemas/_register'

const EXPECTED_SCHEMA_IDS = [
  'mimes-polygon-detail', 'mimes-nbs-scores', 'rfactor-monthly',
  'site-boundary', 'site-extent', 'coast-polygons', 'marine-polygons',
  'watershed-polygons', 'polygon-grid',
  'belize-admin', 'gfw-presence', 'gfw-fishing', 'erosivity-stations',
  'coral-locations', 'flow-names', 'init-areas', 'wind-energy',
  'poly-ebin-ratio', 'polygon-attrs', 'upwind-neighbors',
  'sst-timeseries', 'slr-timeseries', 'jday-table', 'psw-gold-timeseries',
]

describe('schema coverage', () => {
  beforeAll(async () => {
    await import('@/../scripts/pre-process/schemas/index')
  })

  it('every Appendix-A schema family is registered', () => {
    const registered = new Set(getSchemas().map((s) => s.id))
    const missing = EXPECTED_SCHEMA_IDS.filter((id) => !registered.has(id))
    expect(missing).toEqual([])
  })

  it('every registered schema has required fields populated', () => {
    for (const schema of getSchemas()) {
      expect(schema.id).toBeTruthy()
      expect(schema.family).toBeTruthy()
      expect(typeof schema.schemaVersion).toBe('number')
      expect(typeof schema.classify).toBe('function')
      expect(typeof schema.map).toBe('function')
      expect(schema.incoming).toBeDefined()
      expect(Array.isArray(schema.incoming.required)).toBe(true)
      expect(Array.isArray(schema.incoming.optional)).toBe(true)
      expect(Array.isArray(schema.incoming.patterns)).toBe(true)
    }
  })

  it('schema ids are unique', () => {
    const ids = getSchemas().map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
