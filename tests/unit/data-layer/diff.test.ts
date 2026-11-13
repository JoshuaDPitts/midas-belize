import { describe, it, expect } from 'vitest'
import { diffHeader } from '@/../scripts/pre-process/diff'
import type { IncomingSpec } from '@/../scripts/pre-process/schemas/_types'

const spec: IncomingSpec = {
  required: ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count'],
  optional: ['Area_Pct_of_Polygon', 'Mangrove_Pct_in_BIN'],
  patterns: [/^Clade_\d+_pct$/],
}

describe('diffHeader', () => {
  it('returns clean diff when header matches spec exactly', () => {
    const headers = [
      'Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count',
      'Area_Pct_of_Polygon', 'Clade_1_pct',
    ]
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(false)
    expect(diff.missing_required).toEqual([])
    expect(diff.added_unknown).toEqual([])
    expect(diff.renamed_candidates).toEqual([])
  })

  it('reports missing required as breaking', () => {
    const headers = ['BIN_ID', 'BIN_Label', 'Pixel_Count', 'Clade_1_pct']
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(true)
    expect(diff.missing_required).toEqual(['Polygon_ID'])
  })

  it('reports unknown extra column but not as breaking', () => {
    const headers = [
      'Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count',
      'Clade_1_pct', 'Confidence',
    ]
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(false)
    expect(diff.added_unknown).toEqual(['Confidence'])
  })

  it('dynamic-pattern columns do not count as unknown', () => {
    const headers = [
      'Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count',
      'Clade_1_pct', 'Clade_26_pct', 'Clade_100_pct',
    ]
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(false)
    expect(diff.added_unknown).toEqual([])
  })

  it('suggests renamed_candidates when a required is missing and a similar unknown was added', () => {
    const headers = ['poly_id', 'BIN_ID', 'BIN_Label', 'Pixel_Count', 'Clade_1_pct']
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(true)
    expect(diff.renamed_candidates).toHaveLength(1)
    expect(diff.renamed_candidates[0]).toMatchObject({ from: 'Polygon_ID', to: 'poly_id' })
    expect(diff.renamed_candidates[0].confidence).toBeGreaterThan(0)
  })

  it('does not suggest rename when no similar candidate exists', () => {
    const headers = ['BIN_ID', 'BIN_Label', 'Pixel_Count', 'Clade_1_pct', 'xyz']
    const diff = diffHeader(headers, spec)
    expect(diff.isBreaking).toBe(true)
    expect(diff.missing_required).toEqual(['Polygon_ID'])
    expect(diff.renamed_candidates).toEqual([])
  })
})
