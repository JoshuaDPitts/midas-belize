import { describe, it, expect } from 'vitest'
import {
  ProvenanceFileSchema as WebAppSchema,
  ProvenanceSchema as WebAppCoreSchema,
} from '@/lib/data/provenance'
import {
  ProvenanceFileSchema as ScriptsSchema,
  ProvenanceSchema as ScriptsCoreSchema,
} from '@/../scripts/pre-process/provenance-schema'

/**
 * Parity guard for the two copies of ProvenanceFileSchema.
 *
 * Why duplicate: tsx + Node 25 + no `"type": "module"` drops named
 * exports when scripts/ imports transitively from src/. See scripts/
 * pre-process/provenance-schema.ts header for the full story.
 *
 * This test asserts both schemas accept + reject the same representative
 * inputs. If they drift, this breaks.
 */

const CORE_FIXTURE = {
  source: 'MIDAS/MIMES Belize 2026',
  source_url: null,
  license: 'CC BY 4.0',
  citation: 'MIDAS/MIMES Belize 2026 — test',
  upstream_paths: ['reference/x.shp'],
}

const FULL_FIXTURE = {
  ...CORE_FIXTURE,
  bbox: [-88.5, 16.4, -88.0, 16.7] as [number, number, number, number],
  temporal_extent: { start: '2015-01', end: '2024-12' },
  scope: 'site' as const,
  tags: ['marine'],
  dataset_id: 'x',
  schema_family: 'mimes-polygon-detail',
  join_to: 'placencia-30polygons-shape',
  join_key: 'Polygon_ID',
  strict: true,
  sites: ['placencia'],
  title: 'X',
  description: 'Test draft',
  notes: 'anything',
}

const INCOMPLETE_FIXTURE = {
  source: 'x',
  source_url: null,
  // license + citation missing
}

describe('ProvenanceSchema parity (src/ vs scripts/)', () => {
  it('core: both accept the minimal valid provenance', () => {
    expect(WebAppCoreSchema.safeParse(CORE_FIXTURE).success).toBe(true)
    expect(ScriptsCoreSchema.safeParse(CORE_FIXTURE).success).toBe(true)
  })

  it('core: both reject the incomplete fixture', () => {
    expect(WebAppCoreSchema.safeParse(INCOMPLETE_FIXTURE).success).toBe(false)
    expect(ScriptsCoreSchema.safeParse(INCOMPLETE_FIXTURE).success).toBe(false)
  })
})

describe('ProvenanceFileSchema parity (src/ vs scripts/)', () => {
  it('both accept the fully-populated fixture', () => {
    const w = WebAppSchema.safeParse(FULL_FIXTURE)
    const s = ScriptsSchema.safeParse(FULL_FIXTURE)
    expect(w.success).toBe(true)
    expect(s.success).toBe(true)
  })

  it('both accept the minimal core fixture (all file-level fields are optional)', () => {
    expect(WebAppSchema.safeParse(CORE_FIXTURE).success).toBe(true)
    expect(ScriptsSchema.safeParse(CORE_FIXTURE).success).toBe(true)
  })

  it('both reject the incomplete fixture', () => {
    expect(WebAppSchema.safeParse(INCOMPLETE_FIXTURE).success).toBe(false)
    expect(ScriptsSchema.safeParse(INCOMPLETE_FIXTURE).success).toBe(false)
  })

  it('parsed output shape matches for the full fixture', () => {
    const w = WebAppSchema.parse(FULL_FIXTURE)
    const s = ScriptsSchema.parse(FULL_FIXTURE)
    expect(JSON.stringify(w)).toEqual(JSON.stringify(s))
  })
})
