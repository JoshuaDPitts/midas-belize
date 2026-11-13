import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { gunzipSync } from 'node:zlib'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/data/[dataset]/route'

/** Publishes a dataset doc + backing GCS object, returns the version string. */
async function seedDataset(id: string, bytes: Buffer): Promise<string> {
  const db = getFirestore()
  const bucket = getStorage().bucket()
  const version = 'v2026-04-22-abc1234'
  const gcsPath = `${id}/${version}.geojson`
  await bucket.file(gcsPath).save(bytes, {
    contentType: 'application/geo+json',
    resumable: false,
  })
  await db.collection('datasets').doc(id).set({
    id,
    layer: id,
    title: 't',
    description: 't',
    family: 'x',
    schema_id: 'x',
    schema_version: 1,
    scope: 'site',
    sites: ['placencia'],
    visible_at: ['placencia'],
    tags: [],
    current_version: {
      version,
      gcs_path: gcsPath,
      content_type: 'application/geo+json',
      size_bytes: bytes.byteLength,
      bbox: [0, 0, 0, 0],
      published_at: Timestamp.now(),
      pipeline_run_id: 'r1',
    },
    provenance: { source: 'src', source_url: null, license: 'lic', citation: 'cit', upstream_paths: ['x'] },
    status: 'published',
    last_upstream_mtime: Timestamp.now(),
    last_processed_at: Timestamp.now(),
    created_at: Timestamp.now(),
    updated_at: Timestamp.now(),
  })
  return version
}

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('GET /api/data/[dataset]', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    const datasets = await db.collection('datasets').get()
    for (const d of datasets.docs) {
      const vs = await d.ref.collection('versions').get()
      for (const v of vs.docs) await v.ref.delete()
      await d.ref.delete()
    }
  })

  it('streams bytes from GCS with provenance + cache headers', async () => {
    const db = getFirestore()
    const bucket = getStorage().bucket()
    const bytes = Buffer.from('{"type":"FeatureCollection","features":[]}')
    const version = 'v2026-04-22-abc1234'
    const gcsPath = `test-dataset/${version}.geojson`
    await bucket.file(gcsPath).save(bytes, {
      contentType: 'application/geo+json',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    })
    await db
      .collection('datasets')
      .doc('test-dataset')
      .set({
        id: 'test-dataset',
        layer: 'test-dataset',
        title: 't',
        description: 't',
        family: 'x',
        schema_id: 'x',
        schema_version: 1,
        scope: 'site',
        sites: ['placencia'],
        visible_at: ['placencia'],
        tags: [],
        current_version: {
          version,
          gcs_path: gcsPath,
          content_type: 'application/geo+json',
          size_bytes: bytes.byteLength,
          bbox: [0, 0, 0, 0],
          published_at: Timestamp.now(),
          pipeline_run_id: 'r1',
        },
        provenance: {
          source: 'src',
          source_url: null,
          license: 'lic',
          citation: 'cit',
          upstream_paths: ['x'],
        },
        status: 'published',
        last_upstream_mtime: Timestamp.now(),
        last_processed_at: Timestamp.now(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })

    const req = new NextRequest('http://localhost/api/data/test-dataset')
    const res = await GET(req, { params: Promise.resolve({ dataset: 'test-dataset' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/geo+json')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
    expect(res.headers.get('ETag')).toBe(`"${version}"`)
    expect(res.headers.get('X-Dataset-Source')).toBe('src')
    expect(res.headers.get('X-Dataset-License')).toBe('lic')
    expect(res.headers.get('X-Dataset-Citation')).toBe(encodeURIComponent('cit'))
    expect(res.headers.get('X-Dataset-Version')).toBe(version)

    const body = await res.text()
    expect(body).toBe(bytes.toString())
  })

  it('gzip-compresses the body when the client sends Accept-Encoding: gzip', async () => {
    // Large enough that the compressed payload is meaningfully smaller, mirroring
    // why this matters: it keeps oversized GeoJSON under the Cloud Function 32 MiB
    // response cap. gunzip must round-trip back to the exact original bytes.
    const bytes = Buffer.from(JSON.stringify({ type: 'FeatureCollection', features: Array(5000).fill({ type: 'Feature', properties: { Clade_1_pct: 1 }, geometry: null }) }))
    await seedDataset('gz-dataset', bytes)

    const req = new NextRequest('http://localhost/api/data/gz-dataset', {
      headers: { 'accept-encoding': 'gzip, deflate, br' },
    })
    const res = await GET(req, { params: Promise.resolve({ dataset: 'gz-dataset' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBe('gzip')
    expect(res.headers.get('Content-Type')).toBe('application/geo+json')
    expect(res.headers.get('Vary')).toContain('Accept-Encoding')
    // Compressed responses can't declare the identity Content-Length.
    expect(res.headers.get('Content-Length')).toBeNull()

    const compressed = Buffer.from(await res.arrayBuffer())
    expect(compressed.byteLength).toBeLessThan(bytes.byteLength)
    expect(gunzipSync(compressed).toString()).toBe(bytes.toString())
  })

  it('serves identity bytes (no Content-Encoding) when the client does not accept gzip', async () => {
    const bytes = Buffer.from('{"type":"FeatureCollection","features":[]}')
    await seedDataset('raw-dataset', bytes)

    const req = new NextRequest('http://localhost/api/data/raw-dataset') // no Accept-Encoding
    const res = await GET(req, { params: Promise.resolve({ dataset: 'raw-dataset' }) })

    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Encoding')).toBeNull()
    expect(res.headers.get('Content-Length')).toBe(String(bytes.byteLength))
    expect(await res.text()).toBe(bytes.toString())
  })

  it('returns 404 for unknown dataset', async () => {
    const req = new NextRequest('http://localhost/api/data/nope')
    const res = await GET(req, { params: Promise.resolve({ dataset: 'nope' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })

  it('returns 404 for dataset with status !== published', async () => {
    const db = getFirestore()
    await db
      .collection('datasets')
      .doc('blocked')
      .set({
        id: 'blocked',
        status: 'schema-drift-blocked',
        current_version: null,
        provenance: {
          source: 's',
          source_url: null,
          license: 'l',
          citation: 'c',
          upstream_paths: ['x'],
        },
        layer: 'x',
        title: 't',
        description: 't',
        family: 'x',
        schema_id: 'x',
        schema_version: 1,
        scope: 'site',
        sites: ['placencia'],
        visible_at: ['placencia'],
        tags: [],
        last_upstream_mtime: Timestamp.now(),
        last_processed_at: Timestamp.now(),
        created_at: Timestamp.now(),
        updated_at: Timestamp.now(),
      })
    const req = new NextRequest('http://localhost/api/data/blocked')
    const res = await GET(req, { params: Promise.resolve({ dataset: 'blocked' }) })
    expect(res.status).toBe(404)
  })
})
