import { describe, it, expect, beforeEach } from 'vitest'
import { classify } from '@/../scripts/pre-process/classifier'
import { register, clearRegistry } from '@/../scripts/pre-process/registry'
import type { FileGroup } from '@/../scripts/pre-process/types'

function mk(ext: string): FileGroup {
  return {
    primary: {
      path: `raw/x${ext}`,
      relativePath: `x${ext}`,
      ext,
      size_bytes: 1,
      mtime: new Date(0),
    },
    sidecars: [],
    provenanceFile: null,
  }
}

describe('classify', () => {
  beforeEach(() => {
    clearRegistry()
  })

  it('returns null when no handler matches', () => {
    register({
      id: 'shapefile',
      priority: 100,
      match: (g) => g.primary.ext === '.shp',
      convert: async () => {
        throw new Error('nope')
      },
    })
    const result = classify(mk('.unknown'))
    expect(result).toBeNull()
  })

  it('returns the matching handler for a simple extension match', () => {
    register({
      id: 'csv',
      priority: 50,
      match: (g) => g.primary.ext === '.csv',
      convert: async () => {
        throw new Error('nope')
      },
    })
    const result = classify(mk('.csv'))
    expect(result?.id).toBe('csv')
  })

  it('prefers higher-priority handler when multiple match', () => {
    register({
      id: 'csv',
      priority: 50,
      match: (g) => g.primary.ext === '.csv',
      convert: async () => {
        throw new Error('csv')
      },
    })
    register({
      id: 'csv-polygon-join',
      priority: 200,
      match: (g) => g.primary.ext === '.csv',
      convert: async () => {
        throw new Error('join')
      },
    })
    const result = classify(mk('.csv'))
    expect(result?.id).toBe('csv-polygon-join')
  })
})
