import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { runDiscoveryPipeline } from '../../../scripts/pre-process/cli'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('discovery pipeline end-to-end', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['datasets', 'discovered_files', 'pipeline_runs']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) {
        const subs = await d.ref.collection('versions').get()
        for (const s of subs.docs) await s.ref.delete()
        await d.ref.delete()
      }
    }
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles({ prefix: 'raw/' })
    for (const f of files) await f.delete()
  })

  it('writes a discovered_files doc for unrecognized files', async () => {
    const bucket = getStorage().bucket()
    await bucket.file('raw/mystery.kml').save(Buffer.from('<kml/>'))

    await runDiscoveryPipeline({ runId: 'test-run', dryRun: false })

    const db = getFirestore()
    const snap = await db.collection('discovered_files').get()
    expect(snap.size).toBe(1)
    const doc = snap.docs[0].data()
    expect(doc.ext).toBe('.kml')
    expect(doc.status).toBe('unrecognized')
    expect(doc.path).toBe('raw/mystery.kml')
    expect(doc.seen_in_runs).toEqual(['test-run'])
  })

  it('skips lone .provenance.json files — they are not "unrecognized"', async () => {
    const bucket = getStorage().bucket()
    await bucket.file('raw/orphan.provenance.json').save(Buffer.from('{}'))

    await runDiscoveryPipeline({ runId: 'test-run', dryRun: false })

    const db = getFirestore()
    const snap = await db.collection('discovered_files').get()
    expect(snap.size).toBe(0)
  })

  it('upserts the same file across multiple runs with arrayUnion on seen_in_runs', async () => {
    const bucket = getStorage().bucket()
    await bucket.file('raw/mystery.kml').save(Buffer.from('<kml/>'))

    await runDiscoveryPipeline({ runId: 'run-a', dryRun: false })
    await runDiscoveryPipeline({ runId: 'run-b', dryRun: false })

    const db = getFirestore()
    const snap = await db.collection('discovered_files').get()
    expect(snap.size).toBe(1)
    const doc = snap.docs[0].data()
    expect(doc.seen_in_runs.sort()).toEqual(['run-a', 'run-b'])
  })
})
