import { describe, it, expect } from 'vitest'
import type {
  SiteId,
  CatalogEntry,
} from '@/lib/data/types'

describe('data-layer types', () => {
  it('SiteId accepts all three known sites', () => {
    const ids: SiteId[] = ['placencia', 'caye-caulker', 'laughing-bird']
    expect(ids).toHaveLength(3)
  })

  it('CatalogEntry has current_version | null', () => {
    const entry: CatalogEntry = {
      id: 'placencia-site',
      layer: 'site',
      title: 'Placencia site boundary',
      description: 'x',
      family: 'site-boundary',
      schema_id: 'site-boundary',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: ['site-boundary'],
      current_version: null,
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x.shp'],
      },
      status: 'awaiting-provenance',
      last_upstream_mtime: new Date(0) as any,
      last_processed_at: new Date(0) as any,
      created_at: new Date(0) as any,
      updated_at: new Date(0) as any,
    }
    expect(entry.current_version).toBeNull()
  })
})
