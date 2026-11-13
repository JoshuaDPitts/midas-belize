import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { publishAsset } from '../../../scripts/pre-process/publish'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('publishAsset', () => {
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

  it('writes bytes to GCS and upserts the catalog doc + versions subcollection', async () => {
    const asset = {
      bytes: Buffer.from('{"type":"FeatureCollection","features":[]}'),
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: 0,
      bbox: [-89, 15, -87, 19] as [number, number, number, number],
    }
    const definition = {
      id: 'test-dataset',
      title: 'Test',
      description: 't',
      family: 'site-boundary',
      schemaId: 'site-boundary',
      schemaVersion: 1,
      scope: 'site' as const,
      sites: ['placencia'] as const,
      tags: ['test'],
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x.shp'],
      },
    }
    const inputs = [{ path: 'x.shp', bytes: Buffer.from('fake') }]

    const result = await publishAsset({
      definition,
      asset,
      inputs,
      pipelineRunId: 'run-1',
    })

    expect(result.version).toMatch(/^v\d{4}-\d{2}-\d{2}-[0-9a-f]{7}$/)
    expect(result.gcsPath).toBe(`test-dataset/${result.version}.geojson`)

    const [gcsBytes] = await getStorage().bucket().file(result.gcsPath).download()
    expect(gcsBytes.toString()).toBe(asset.bytes.toString())

    const docSnap = await getFirestore().collection('datasets').doc('test-dataset').get()
    expect(docSnap.exists).toBe(true)
    const doc = docSnap.data()!
    expect(doc.current_version.version).toBe(result.version)
    expect(doc.current_version.gcs_path).toBe(result.gcsPath)
    expect(doc.status).toBe('published')
    expect(doc.visible_at).toEqual(['placencia'])

    const versionSnap = await docSnap.ref.collection('versions').doc(result.version).get()
    expect(versionSnap.exists).toBe(true)
    expect(versionSnap.data()!.is_current).toBe(true)
  })

  it('short-circuits when inputs hash is unchanged', async () => {
    const asset = {
      bytes: Buffer.from('{"type":"FeatureCollection","features":[]}'),
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: 0,
      bbox: [-89, 15, -87, 19] as [number, number, number, number],
    }
    const definition = {
      id: 'idem',
      title: 't',
      description: 't',
      family: 'site-boundary',
      schemaId: 'site-boundary',
      schemaVersion: 1,
      scope: 'site' as const,
      sites: ['placencia'] as const,
      tags: [],
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x.shp'],
      },
    }
    const inputs = [{ path: 'x.shp', bytes: Buffer.from('same') }]

    const r1 = await publishAsset({ definition, asset, inputs, pipelineRunId: 'r1' })
    const r2 = await publishAsset({ definition, asset, inputs, pipelineRunId: 'r2' })

    expect(r2.version).toBe(r1.version)
    expect(r2.skipped).toBe(true)
  })

  it('expands visible_at for national scope', async () => {
    const asset = {
      bytes: Buffer.from('{}'),
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: 0,
      bbox: [-89, 15, -87, 19] as [number, number, number, number],
    }
    const definition = {
      id: 'national-ds',
      title: 't',
      description: 't',
      family: 'belize-admin',
      schemaId: 'belize-admin',
      schemaVersion: 1,
      scope: 'national' as const,
      sites: [] as const,
      tags: [],
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
    }
    await publishAsset({
      definition,
      asset,
      inputs: [{ path: 'x', bytes: Buffer.from('a') }],
      pipelineRunId: 'r',
    })

    const snap = await getFirestore().collection('datasets').doc('national-ds').get()
    expect(snap.data()!.visible_at.sort()).toEqual([
      'caye-caulker',
      'laughing-bird',
      'placencia',
    ])
  })
})
