import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/timeseries/[dataset]/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

interface PolygonEntry {
  polygon_id: number | string
  values: Array<number | null>
}

describe('GET /api/timeseries/[dataset]', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    const snap = await db.collection('datasets').get()
    for (const d of snap.docs) await d.ref.delete()
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
  })

  async function seedTimeseriesDataset() {
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            polygon_id: 1,
            baseline: { '2015-01': 0.7, '2015-02': 0.72, '2015-03': 0.74 },
            rcp45: { '2015-01': 0.65, '2015-02': 0.66, '2015-03': 0.67 },
          },
          geometry: { type: 'Point', coordinates: [-88.3, 16.5] },
        },
        {
          type: 'Feature',
          properties: {
            polygon_id: 2,
            baseline: { '2015-01': 0.5, '2015-02': 0.51, '2015-03': 0.52 },
            rcp45: { '2015-01': 0.45, '2015-02': 0.46, '2015-03': 0.47 },
          },
          geometry: { type: 'Point', coordinates: [-88.3, 16.6] },
        },
      ],
    }
    const bucket = getStorage().bucket()
    const gcsPath = 'placencia-coral-ts/v2026-04-22-abc1234.geojson'
    await bucket.file(gcsPath).save(Buffer.from(JSON.stringify(fc)))

    await getFirestore().collection('datasets').doc('placencia-coral-ts').set({
      id: 'placencia-coral-ts',
      layer: 'x',
      title: 't',
      description: 't',
      family: 'mimes-polygon-detail',
      schema_id: 'mimes-polygon-detail',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: ['marine'],
      current_version: {
        version: 'v2026-04-22-abc1234',
        gcs_path: gcsPath,
        content_type: 'application/geo+json',
        size_bytes: 500,
        bbox: [-88.3, 16.5, -88.3, 16.6],
        temporal_extent: { start: '2015-01', end: '2015-03' },
        published_at: Timestamp.now(),
        pipeline_run_id: 'r',
      },
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      status: 'published',
      last_upstream_mtime: Timestamp.now(),
      last_processed_at: Timestamp.now(),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
  }

  it('returns { time_axis, polygons, provenance } for scenario=baseline', async () => {
    await seedTimeseriesDataset()
    const req = new NextRequest(
      'http://localhost/api/timeseries/placencia-coral-ts?scenario=baseline&metric=coral',
    )
    const res = await GET(req, { params: Promise.resolve({ dataset: 'placencia-coral-ts' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.time_axis).toEqual(['2015-01', '2015-02', '2015-03'])
    expect(body.polygons).toHaveLength(2)
    const poly1 = body.polygons.find((p: PolygonEntry) => p.polygon_id === 1)
    const poly2 = body.polygons.find((p: PolygonEntry) => p.polygon_id === 2)
    expect(poly1!.values).toEqual([0.7, 0.72, 0.74])
    expect(poly2!.values).toEqual([0.5, 0.51, 0.52])
    expect(body.provenance.source).toBe('s')
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600')
  })

  it('returns rcp45 values when scenario=rcp45', async () => {
    await seedTimeseriesDataset()
    const req = new NextRequest(
      'http://localhost/api/timeseries/placencia-coral-ts?scenario=rcp45&metric=coral',
    )
    const res = await GET(req, { params: Promise.resolve({ dataset: 'placencia-coral-ts' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    const poly1 = body.polygons.find((p: PolygonEntry) => p.polygon_id === 1)
    expect(poly1!.values).toEqual([0.65, 0.66, 0.67])
  })

  it('400 when required query params are missing', async () => {
    await seedTimeseriesDataset()
    const req = new NextRequest('http://localhost/api/timeseries/placencia-coral-ts')
    const res = await GET(req, { params: Promise.resolve({ dataset: 'placencia-coral-ts' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION')
  })

  it('404 for unknown scenario key', async () => {
    await seedTimeseriesDataset()
    const req = new NextRequest(
      'http://localhost/api/timeseries/placencia-coral-ts?scenario=nope&metric=coral',
    )
    const res = await GET(req, { params: Promise.resolve({ dataset: 'placencia-coral-ts' }) })
    expect(res.status).toBe(404)
  })

  it('404 for unknown dataset', async () => {
    const req = new NextRequest(
      'http://localhost/api/timeseries/nonexistent?scenario=baseline&metric=coral',
    )
    const res = await GET(req, { params: Promise.resolve({ dataset: 'nonexistent' }) })
    expect(res.status).toBe(404)
  })
})
