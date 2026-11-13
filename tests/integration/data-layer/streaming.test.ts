import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/data/[dataset]/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('streaming large responses', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
    const db = getFirestore()
    const snap = await db.collection('datasets').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  it('streams a 20 MB blob without buffering (heap delta < 10 MB)', async () => {
    const SIZE = 20 * 1024 * 1024
    const bucket = getStorage().bucket()
    const version = 'v2026-04-22-big0000'
    const gcsPath = `big/${version}.bin`
    await bucket.file(gcsPath).save(Buffer.alloc(SIZE, 0), {
      contentType: 'application/octet-stream',
      resumable: false,
    })

    await getFirestore().collection('datasets').doc('big').set({
      id: 'big',
      status: 'published',
      current_version: {
        version,
        gcs_path: gcsPath,
        content_type: 'application/octet-stream',
        size_bytes: SIZE,
        bbox: [0, 0, 0, 0],
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
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: [],
      layer: 'big',
      title: 't',
      description: 't',
      family: 'x',
      schema_id: 'x',
      schema_version: 1,
      last_upstream_mtime: Timestamp.now(),
      last_processed_at: Timestamp.now(),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })

    if (global.gc) global.gc()
    const baseHeap = process.memoryUsage().heapUsed

    const req = new NextRequest('http://localhost/api/data/big')
    const res = await GET(req, { params: Promise.resolve({ dataset: 'big' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Length')).toBe(String(SIZE))

    const reader = res.body!.getReader()
    let totalRead = 0
    let maxDelta = 0
    const sampleInterval = 4 * 1024 * 1024
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      totalRead += value.byteLength
      if (totalRead % sampleInterval < value.byteLength) {
        const delta = process.memoryUsage().heapUsed - baseHeap
        if (delta > maxDelta) maxDelta = delta
      }
    }
    expect(totalRead).toBe(SIZE)
    expect(maxDelta).toBeLessThan(10 * 1024 * 1024)
  }, 120_000)
})
