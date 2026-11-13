import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { publishAsset } from '../../../scripts/pre-process/publish'
import type { DatasetDefinition } from '../../../scripts/pre-process/types'
import type { ConvertedAsset } from '../../../scripts/pre-process/types'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

function makeAsset(bytes?: Buffer): ConvertedAsset {
  return {
    bytes: bytes ?? Buffer.from('{"type":"FeatureCollection","features":[]}'),
    contentType: 'application/geo+json',
    extension: '.geojson',
    feature_count: 0,
    bbox: [0, 0, 0, 0],
  }
}

function makeDef(id: string): DatasetDefinition {
  return {
    id,
    title: id,
    description: id,
    family: 'site-boundary',
    schemaId: 'site-boundary',
    schemaVersion: 1,
    scope: 'site',
    sites: ['placencia'],
    tags: [],
    upstream: { kind: 'geojson', basePath: 'raw', primaryFile: `${id}.geojson` },
    provenance: {
      source: 's',
      source_url: null,
      license: 'l',
      citation: 'c',
      upstream_paths: ['x'],
    },
  }
}

describe('idempotency — publishAsset short-circuits on unchanged inputs', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    const datasets = await db.collection('datasets').get()
    for (const d of datasets.docs) {
      const versions = await d.ref.collection('versions').get()
      for (const v of versions.docs) await v.ref.delete()
      await d.ref.delete()
    }
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
  })

  it('second run of identical inputs returns skipped=true, same version string', async () => {
    const inputs = [{ path: 'x', bytes: Buffer.from('same') }]
    const r1 = await publishAsset({
      definition: makeDef('ds-a'),
      asset: makeAsset(),
      inputs,
      pipelineRunId: 'r1',
    })
    const r2 = await publishAsset({
      definition: makeDef('ds-a'),
      asset: makeAsset(),
      inputs,
      pipelineRunId: 'r2',
    })
    expect(r1.skipped).toBe(false)
    expect(r2.skipped).toBe(true)
    expect(r2.version).toBe(r1.version)
  })

  it('one-byte change produces exactly one new current version', async () => {
    const ins1 = [{ path: 'x', bytes: Buffer.from('v1') }]
    const ins2 = [{ path: 'x', bytes: Buffer.from('v2') }]
    const r1 = await publishAsset({
      definition: makeDef('ds-b'),
      asset: makeAsset(),
      inputs: ins1,
      pipelineRunId: 'r1',
    })
    const r2 = await publishAsset({
      definition: makeDef('ds-b'),
      asset: makeAsset(),
      inputs: ins2,
      pipelineRunId: 'r2',
    })
    expect(r2.version).not.toBe(r1.version)
    expect(r2.skipped).toBe(false)

    const db = getFirestore()
    const versions = await db.collection('datasets').doc('ds-b').collection('versions').get()
    expect(versions.size).toBe(2)
    const current = versions.docs.find((d) => d.data().is_current)
    expect(current?.id).toBe(r2.version)
  })

  it('multiple unchanged datasets all skip in one concurrent batch', async () => {
    const inputs = [{ path: 'x', bytes: Buffer.from('z') }]
    for (const id of ['ds-c', 'ds-d', 'ds-e']) {
      await publishAsset({
        definition: makeDef(id),
        asset: makeAsset(),
        inputs,
        pipelineRunId: 'first',
      })
    }
    const results = await Promise.all(
      ['ds-c', 'ds-d', 'ds-e'].map((id) =>
        publishAsset({
          definition: makeDef(id),
          asset: makeAsset(),
          inputs,
          pipelineRunId: 'second',
        }),
      ),
    )
    expect(results.every((r) => r.skipped)).toBe(true)
  })

  it('converter output change (same input bytes) produces a new version', async () => {
    const inputs = [{ path: 'x', bytes: Buffer.from('source') }]
    const r1 = await publishAsset({
      definition: makeDef('ds-converter-change'),
      asset: makeAsset(Buffer.from('v1-output')),
      inputs,
      pipelineRunId: 'r1',
    })
    const r2 = await publishAsset({
      definition: makeDef('ds-converter-change'),
      asset: makeAsset(Buffer.from('v2-output')),
      inputs,
      pipelineRunId: 'r2',
    })
    expect(r1.skipped).toBe(false)
    expect(r2.skipped).toBe(false)
    expect(r2.version).not.toBe(r1.version)
  })

  it('hash depends on bytes, not on paths — renamed path with same bytes still idempotent', async () => {
    const r1 = await publishAsset({
      definition: makeDef('ds-f'),
      asset: makeAsset(),
      inputs: [{ path: 'a', bytes: Buffer.from('body') }],
      pipelineRunId: 'r1',
    })
    const r2 = await publishAsset({
      definition: makeDef('ds-f'),
      asset: makeAsset(),
      inputs: [{ path: 'b', bytes: Buffer.from('body') }],
      pipelineRunId: 'r2',
    })
    expect(r2.skipped).toBe(true)
    expect(r2.version).toBe(r1.version)
  })
})
