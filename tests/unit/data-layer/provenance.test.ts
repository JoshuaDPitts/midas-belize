import { describe, it, expect } from 'vitest'
import { validateProvenance, ProvenanceFileSchema } from '@/lib/data/provenance'

describe('validateProvenance', () => {
  it('accepts a complete provenance object', () => {
    const result = validateProvenance({
      source: 'MIDAS/MIMES Belize 2026',
      source_url: null,
      license: 'Internal',
      citation: 'Author et al. (2026)',
      upstream_paths: ['x.shp'],
    })
    expect(result.ok).toBe(true)
  })

  it('rejects missing license', () => {
    const result = validateProvenance({
      source: 's',
      source_url: null,
      license: '',
      citation: 'c',
      upstream_paths: ['x'],
    })
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.errors.some((e) => e.includes('license'))).toBe(true)
  })

  it('rejects empty upstream_paths', () => {
    const result = validateProvenance({
      source: 's',
      source_url: null,
      license: 'l',
      citation: 'c',
      upstream_paths: [],
    })
    expect(result.ok).toBe(false)
  })

  it('ProvenanceFileSchema accepts optional fields', () => {
    const parsed = ProvenanceFileSchema.safeParse({
      source: 's',
      source_url: null,
      license: 'l',
      citation: 'c',
      upstream_paths: ['x'],
      bbox: [-89, 15, -87, 19],
      temporal_extent: { start: '2020-01', end: '2020-12' },
      scope: 'national',
      tags: ['a'],
      notes: '',
    })
    expect(parsed.success).toBe(true)
  })
})
