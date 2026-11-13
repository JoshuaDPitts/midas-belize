import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { seedFromRaw } from '../../../scripts/pre-process/seed'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

const FIXTURE_DIR = path.join(__dirname, '../../fixtures/data-layer/tiny-polygon')

async function uploadFixtureToRaw(prefix: string) {
  const bucket = getStorage().bucket()
  const files = await fs.readdir(FIXTURE_DIR)
  for (const name of files) {
    const bytes = await fs.readFile(path.join(FIXTURE_DIR, name))
    await bucket.file(`raw/${prefix}/${name}`).save(bytes)
  }
  await bucket.file(`raw/${prefix}/tiny.provenance.json`).save(
    JSON.stringify({
      source: 'Test fixture',
      source_url: null,
      license: 'Test',
      citation: 'Test fixture for seed.integration.test',
      upstream_paths: [`${prefix}/tiny.shp`],
      dataset_id: 'tiny-fixture',
      schema_family: 'polygon-grid',
      scope: 'site',
      sites: ['placencia'],
    }),
  )
}

describe('seed', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['datasets', 'pipeline_runs', 'discovered_files']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) {
        const vs = await d.ref.collection('versions').get()
        for (const v of vs.docs) await v.ref.delete()
        await d.ref.delete()
      }
    }
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
  })

  it('discovers + converts + publishes every recognizable file with provenance', async () => {
    await uploadFixtureToRaw('tinytest')

    const summary = await seedFromRaw({ runId: 'seed-test-1', dryRun: false })
    expect(summary.published).toBeGreaterThan(0)
    expect(summary.skipped_nochange).toBe(0)

    const snap = await getFirestore().collection('datasets').doc('tiny-fixture').get()
    expect(snap.exists).toBe(true)
    expect(snap.data()!.status).toBe('published')
  })

  it('second seed is a full-skip (idempotent via content hash)', async () => {
    await uploadFixtureToRaw('tinytest')
    await seedFromRaw({ runId: 'seed-test-a', dryRun: false })
    const summary = await seedFromRaw({ runId: 'seed-test-b', dryRun: false })
    expect(summary.published).toBe(0)
    expect(summary.skipped_nochange).toBeGreaterThan(0)
  })

  it('dry run touches nothing in Firestore but reports would_publish', async () => {
    await uploadFixtureToRaw('tinytest')
    const summary = await seedFromRaw({ runId: 'dry-1', dryRun: true })
    expect(summary.would_publish).toBeGreaterThan(0)
    expect(summary.published).toBe(0)
    const snap = await getFirestore().collection('datasets').doc('tiny-fixture').get()
    expect(snap.exists).toBe(false)
  })

  it('files without provenance are counted as blocked_provenance, not published', async () => {
    const bucket = getStorage().bucket()
    const files = await fs.readdir(FIXTURE_DIR)
    for (const name of files) {
      const bytes = await fs.readFile(path.join(FIXTURE_DIR, name))
      await bucket.file(`raw/noprov/${name}`).save(bytes)
    }
    const summary = await seedFromRaw({ runId: 'noprov-1', dryRun: false })
    expect(summary.blocked_provenance).toBeGreaterThan(0)
    expect(summary.published).toBe(0)
  })

  it('provenance-unresolved tag blocks publish even when all required fields pass Zod', async () => {
    const bucket = getStorage().bucket()
    const files = await fs.readdir(FIXTURE_DIR)
    for (const name of files) {
      const bytes = await fs.readFile(path.join(FIXTURE_DIR, name))
      await bucket.file(`raw/unresolved/${name}`).save(bytes)
    }
    // Provenance validates fine but carries the unresolved tag — source/license/citation
    // are non-empty sentinels, not real attribution.
    await bucket.file('raw/unresolved/tiny.provenance.json').save(
      JSON.stringify({
        source: 'Unknown — requires identification',
        source_url: null,
        license: 'Unknown — requires identification',
        citation: 'Unknown — requires identification',
        upstream_paths: ['unresolved/tiny.shp'],
        dataset_id: 'tiny-unresolved',
        schema_family: 'polygon-grid',
        scope: 'site',
        sites: ['placencia'],
        tags: ['provenance-unresolved'],
      }),
    )
    const summary = await seedFromRaw({ runId: 'unresolved-1', dryRun: false })
    expect(summary.blocked_provenance).toBeGreaterThan(0)
    expect(summary.published).toBe(0)
    const snap = await getFirestore().collection('datasets').doc('tiny-unresolved').get()
    expect(snap.exists).toBe(false)
  })
})
