import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/layers/[site]/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('GET /api/layers/[site]', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const db = getFirestore()
    const snap = await db.collection('datasets').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  async function seed(
    id: string,
    visible_at: string[],
    tags: string[],
    status = 'published',
  ) {
    await getFirestore()
      .collection('datasets')
      .doc(id)
      .set({
        id,
        layer: id,
        title: id,
        description: id,
        family: 'x',
        schema_id: 'x',
        schema_version: 1,
        scope: visible_at.length === 3 ? 'national' : 'site',
        sites: visible_at,
        visible_at,
        tags,
        current_version:
          status === 'published'
            ? {
                version: 'v1',
                gcs_path: `${id}/v1.geojson`,
                content_type: 'application/geo+json',
                size_bytes: 10,
                bbox: [0, 0, 0, 0],
                published_at: Timestamp.now(),
                pipeline_run_id: 'r1',
              }
            : null,
        provenance: {
          source: 's',
          source_url: null,
          license: 'l',
          citation: 'c',
          upstream_paths: ['x'],
        },
        status,
        last_upstream_mtime: Timestamp.now(),
        last_processed_at: Timestamp.now(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })
  }

  it('returns published datasets visible at the site', async () => {
    await seed('a', ['placencia'], ['marine'])
    await seed('b', ['caye-caulker'], ['marine'])
    await seed('c', ['placencia', 'caye-caulker', 'laughing-bird'], ['watershed'])

    const req = new NextRequest('http://localhost/api/layers/placencia')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    const body = await res.json()

    expect(res.status).toBe(200)
    const ids = body.layers.map((l: { id: string }) => l.id).sort()
    expect(ids).toEqual(['a', 'c'])
  })

  it('filters by domain tag when ?domain=<tag> provided', async () => {
    await seed('a', ['placencia'], ['marine'])
    await seed('b', ['placencia'], ['watershed'])

    const req = new NextRequest('http://localhost/api/layers/placencia?domain=marine')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    const body = await res.json()
    expect(body.layers.map((l: { id: string }) => l.id)).toEqual(['a'])
  })

  it('omits non-published datasets', async () => {
    await seed('a', ['placencia'], ['marine'])
    await seed('b', ['placencia'], ['marine'], 'awaiting-provenance')
    const req = new NextRequest('http://localhost/api/layers/placencia')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    const body = await res.json()
    expect(body.layers.map((l: { id: string }) => l.id)).toEqual(['a'])
  })

  it('400s on unknown site', async () => {
    const req = new NextRequest('http://localhost/api/layers/nowhere')
    const res = await GET(req, { params: Promise.resolve({ site: 'nowhere' }) })
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error.code).toBe('VALIDATION')
  })
})
