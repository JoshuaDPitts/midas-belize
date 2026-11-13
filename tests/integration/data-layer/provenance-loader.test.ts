import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { loadProvenanceForGroup } from '../../../scripts/pre-process/provenance'
import type { FileGroup } from '../../../scripts/pre-process/types'

process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('loadProvenanceForGroup', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
  })

  function mkGroup(rel: string, provRel: string | null): FileGroup {
    return {
      primary: {
        path: `raw/${rel}`,
        relativePath: rel,
        ext: '.csv',
        size_bytes: 1,
        mtime: new Date(0),
      },
      sidecars: [],
      provenanceFile: provRel
        ? {
            path: `raw/${provRel}`,
            relativePath: provRel,
            ext: '.json',
            size_bytes: 1,
            mtime: new Date(0),
          }
        : null,
    }
  }

  it('returns ok with parsed provenance when .provenance.json is complete', async () => {
    await getStorage().bucket().file('raw/x.provenance.json').save(
      JSON.stringify({
        source: 'MIDAS',
        source_url: null,
        license: 'CC-BY-4.0',
        citation: 'Author 2025',
        upstream_paths: ['x.csv'],
      }),
    )
    const result = await loadProvenanceForGroup(mkGroup('x.csv', 'x.provenance.json'))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.provenance.source).toBe('MIDAS')
      expect(result.provenance.license).toBe('CC-BY-4.0')
      expect(result.provenance.upstream_paths).toEqual(['x.csv'])
    }
  })

  it('returns awaiting-provenance when no companion file is attached to the group', async () => {
    const result = await loadProvenanceForGroup(mkGroup('x.csv', null))
    expect(result.status).toBe('awaiting-provenance')
  })

  it('returns provenance-incomplete on missing required fields', async () => {
    await getStorage().bucket().file('raw/x.provenance.json').save(
      JSON.stringify({ source: 'MIDAS', source_url: null }),
    )
    const result = await loadProvenanceForGroup(mkGroup('x.csv', 'x.provenance.json'))
    expect(result.status).toBe('provenance-incomplete')
    if (result.status === 'provenance-incomplete') {
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some((e) => e.includes('license'))).toBe(true)
    }
  })

  it('returns provenance-incomplete when the JSON is malformed', async () => {
    await getStorage().bucket().file('raw/x.provenance.json').save('{ not json')
    const result = await loadProvenanceForGroup(mkGroup('x.csv', 'x.provenance.json'))
    expect(result.status).toBe('provenance-incomplete')
    if (result.status === 'provenance-incomplete') {
      expect(result.errors.some((e) => /parse|JSON/i.test(e))).toBe(true)
    }
  })

  it('surfaces hints (join_to, join_key, strict) on the returned result', async () => {
    await getStorage().bucket().file('raw/x.provenance.json').save(
      JSON.stringify({
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x.csv'],
        join_to: 'placencia-30polygons-shape',
        join_key: 'Polygon_ID',
        strict: true,
        scope: 'site',
        tags: ['mangrove'],
      }),
    )
    const result = await loadProvenanceForGroup(mkGroup('x.csv', 'x.provenance.json'))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.hints.join_to).toBe('placencia-30polygons-shape')
      expect(result.hints.join_key).toBe('Polygon_ID')
      expect(result.hints.strict).toBe(true)
      expect(result.hints.scope).toBe('site')
      expect(result.hints.tags).toEqual(['mangrove'])
    }
  })

  it('defaults strict to false when omitted', async () => {
    await getStorage().bucket().file('raw/x.provenance.json').save(
      JSON.stringify({
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x.csv'],
      }),
    )
    const result = await loadProvenanceForGroup(mkGroup('x.csv', 'x.provenance.json'))
    expect(result.status).toBe('ok')
    if (result.status === 'ok') {
      expect(result.hints.strict).toBe(false)
    }
  })
})
