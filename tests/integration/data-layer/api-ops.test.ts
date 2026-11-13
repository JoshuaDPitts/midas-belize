import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { NextRequest } from 'next/server'
import { GET as getDatasets } from '@/app/api/ops/datasets/route'
import { GET as getDatasetById } from '@/app/api/ops/datasets/[id]/route'
import { GET as getRuns } from '@/app/api/ops/runs/route'
import { GET as getRunById } from '@/app/api/ops/runs/[id]/route'
import { GET as getDrift } from '@/app/api/ops/drift/route'
import { GET as getDriftById } from '@/app/api/ops/drift/[id]/route'
import { GET as getDiscovered } from '@/app/api/ops/discovered/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

interface MinimalDoc {
  id: string
}

describe('ops read endpoints', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['datasets', 'pipeline_runs', 'schema_drift', 'discovered_files']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) await d.ref.delete()
    }
  })

  it('GET /api/ops/datasets returns all, including non-published', async () => {
    const db = getFirestore()
    await db.collection('datasets').doc('a').set({ id: 'a', status: 'published', updated_at: Timestamp.now() })
    await db.collection('datasets').doc('b').set({ id: 'b', status: 'awaiting-provenance', updated_at: Timestamp.now() })
    const res = await getDatasets(new NextRequest('http://localhost/api/ops/datasets'), {
      params: Promise.resolve({}),
    })
    const body = await res.json()
    expect(body.datasets.map((d: MinimalDoc) => d.id).sort()).toEqual(['a', 'b'])
    expect(res.headers.get('Cache-Control')).toBe('no-cache')
  })

  it('GET /api/ops/datasets?status=awaiting-provenance filters', async () => {
    const db = getFirestore()
    await db.collection('datasets').doc('a').set({ id: 'a', status: 'published', updated_at: Timestamp.now() })
    await db.collection('datasets').doc('b').set({ id: 'b', status: 'awaiting-provenance', updated_at: Timestamp.now() })
    const res = await getDatasets(
      new NextRequest('http://localhost/api/ops/datasets?status=awaiting-provenance'),
      { params: Promise.resolve({}) },
    )
    const body = await res.json()
    expect(body.datasets.map((d: MinimalDoc) => d.id)).toEqual(['b'])
  })

  it('GET /api/ops/datasets/[id] returns a single dataset or 404', async () => {
    const db = getFirestore()
    await db.collection('datasets').doc('a').set({ id: 'a', status: 'published', updated_at: Timestamp.now() })
    const ok = await getDatasetById(new NextRequest('http://localhost/api/ops/datasets/a'), {
      params: Promise.resolve({ id: 'a' }),
    })
    expect(ok.status).toBe(200)
    const miss = await getDatasetById(new NextRequest('http://localhost/api/ops/datasets/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    })
    expect(miss.status).toBe(404)
  })

  it('GET /api/ops/runs returns recent runs in descending order', async () => {
    const db = getFirestore()
    await db
      .collection('pipeline_runs')
      .doc('r1')
      .set({ status: 'success', started_at: Timestamp.fromMillis(1000) })
    await db
      .collection('pipeline_runs')
      .doc('r2')
      .set({ status: 'failed', started_at: Timestamp.fromMillis(2000) })
    const res = await getRuns(new NextRequest('http://localhost/api/ops/runs'), {
      params: Promise.resolve({}),
    })
    const body = await res.json()
    expect(body.runs.map((r: MinimalDoc) => r.id)).toEqual(['r2', 'r1'])
  })

  it('GET /api/ops/runs/[id] returns one run or 404', async () => {
    const db = getFirestore()
    await db.collection('pipeline_runs').doc('r1').set({ status: 'success', started_at: Timestamp.now() })
    const ok = await getRunById(new NextRequest('http://localhost/api/ops/runs/r1'), {
      params: Promise.resolve({ id: 'r1' }),
    })
    expect(ok.status).toBe(200)
    const miss = await getRunById(new NextRequest('http://localhost/api/ops/runs/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    })
    expect(miss.status).toBe(404)
  })

  it('GET /api/ops/drift returns open tickets by default', async () => {
    const db = getFirestore()
    await db.collection('schema_drift').doc('d1').set({ status: 'open', detected_at: Timestamp.now() })
    await db.collection('schema_drift').doc('d2').set({ status: 'accepted', detected_at: Timestamp.now() })
    const res = await getDrift(new NextRequest('http://localhost/api/ops/drift'), {
      params: Promise.resolve({}),
    })
    const body = await res.json()
    expect(body.drift.map((d: MinimalDoc) => d.id)).toEqual(['d1'])
  })

  it('GET /api/ops/drift/[id] returns one ticket regardless of status, 404 if missing', async () => {
    const db = getFirestore()
    await db
      .collection('schema_drift')
      .doc('d-resolved')
      .set({ status: 'accepted', detected_at: Timestamp.now() })
    const ok = await getDriftById(new NextRequest('http://localhost/api/ops/drift/d-resolved'), {
      params: Promise.resolve({ id: 'd-resolved' }),
    })
    expect(ok.status).toBe(200)
    const body = await ok.json()
    expect(body.drift.id).toBe('d-resolved')
    expect(body.drift.status).toBe('accepted')
    const miss = await getDriftById(new NextRequest('http://localhost/api/ops/drift/nope'), {
      params: Promise.resolve({ id: 'nope' }),
    })
    expect(miss.status).toBe(404)
  })

  it('GET /api/ops/discovered returns unrecognized by default', async () => {
    const db = getFirestore()
    await db.collection('discovered_files').doc('f1').set({ status: 'unrecognized', last_seen: Timestamp.now() })
    await db.collection('discovered_files').doc('f2').set({ status: 'ignored', last_seen: Timestamp.now() })
    const res = await getDiscovered(new NextRequest('http://localhost/api/ops/discovered'), {
      params: Promise.resolve({}),
    })
    const body = await res.json()
    expect(body.discovered.map((d: MinimalDoc) => d.id)).toEqual(['f1'])
  })
})
