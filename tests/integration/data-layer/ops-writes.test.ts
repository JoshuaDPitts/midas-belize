import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { NextRequest } from 'next/server'
import { POST as postRerun } from '@/app/api/ops/rerun/[dataset]/route'
import { POST as postResolveDrift } from '@/app/api/ops/drift/[id]/resolve/route'
import { POST as postClassifyDiscovered } from '@/app/api/ops/discovered/[hash]/classify/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.GITHUB_DISPATCH_TOKEN = 'fake-token'
process.env.GITHUB_REPO_OWNER = 'midas'
process.env.GITHUB_REPO_NAME = 'belize'

describe('POST /api/ops/rerun/[dataset]', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['datasets', 'pipeline_runs', 'rate_limits', 'schema_drift', 'discovered_files']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) await d.ref.delete()
    }
    vi.restoreAllMocks()
  })

  async function seedDataset() {
    await getFirestore().collection('datasets').doc('placencia-site').set({
      id: 'placencia-site',
      status: 'published',
      updated_at: Timestamp.now(),
    })
  }

  it('fires repository_dispatch and writes a pipeline_runs doc', async () => {
    await seedDataset()
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    const req = new NextRequest('http://localhost/api/ops/rerun/placencia-site', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.1' },
    })
    const res = await postRerun(req, { params: Promise.resolve({ dataset: 'placencia-site' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.run_id).toBeTruthy()
    expect(body.status).toBe('queued')

    expect(fetchSpy).toHaveBeenCalled()
    const [url, init] = fetchSpy.mock.calls[0]
    expect(String(url)).toContain('/repos/midas/belize/dispatches')
    const initRecord = init as { method?: string; body?: string }
    expect(initRecord.method).toBe('POST')
    const dispatchBody = JSON.parse(initRecord.body ?? '{}')
    expect(dispatchBody).toEqual({
      event_type: 'rerun',
      client_payload: { dataset_id: 'placencia-site', run_id: body.run_id },
    })

    const runSnap = await getFirestore().collection('pipeline_runs').doc(body.run_id).get()
    expect(runSnap.exists).toBe(true)
    expect(runSnap.data()!.triggered_by).toBe('dataset-rerun')
  })

  it('429 after rate-limit is exhausted for the same IP', async () => {
    await seedDataset()
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    const ip = '10.0.0.2'
    for (let i = 0; i < 10; i++) {
      const req = new NextRequest('http://localhost/api/ops/rerun/placencia-site', {
        method: 'POST',
        headers: { 'x-forwarded-for': ip },
      })
      const res = await postRerun(req, { params: Promise.resolve({ dataset: 'placencia-site' }) })
      expect(res.status).toBe(200)
    }
    const blocked = new NextRequest('http://localhost/api/ops/rerun/placencia-site', {
      method: 'POST',
      headers: { 'x-forwarded-for': ip },
    })
    const res = await postRerun(blocked, {
      params: Promise.resolve({ dataset: 'placencia-site' }),
    })
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error.code).toBe('RATE_LIMIT')
    expect(body.error.details.retryAfter).toBeGreaterThan(0)
  })

  it('404 when dataset does not exist', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))
    const req = new NextRequest('http://localhost/api/ops/rerun/nope', {
      method: 'POST',
      headers: { 'x-forwarded-for': '10.0.0.3' },
    })
    const res = await postRerun(req, { params: Promise.resolve({ dataset: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/ops/drift/[id]/resolve', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['schema_drift', 'rate_limits']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) await d.ref.delete()
    }
    vi.restoreAllMocks()
  })

  it('updates the ticket status on defer (no PR)', async () => {
    await getFirestore().collection('schema_drift').doc('d1').set({
      status: 'open',
      detected_at: Timestamp.now(),
    })
    const req = new NextRequest('http://localhost/api/ops/drift/d1/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.1', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'defer', notes: 'reviewing later' }),
    })
    const res = await postResolveDrift(req, { params: Promise.resolve({ id: 'd1' }) })
    expect(res.status).toBe(200)
    const updated = (await getFirestore().collection('schema_drift').doc('d1').get()).data()!
    expect(updated.status).toBe('deferred')
    expect(updated.resolution_notes).toBe('reviewing later')
    expect(updated.resolution_commit_sha).toBeNull()
  })

  it('updates ticket status on reject without opening a PR', async () => {
    await getFirestore().collection('schema_drift').doc('d-reject').set({
      status: 'open',
      detected_at: Timestamp.now(),
    })
    const req = new NextRequest('http://localhost/api/ops/drift/d-reject/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.4', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'reject', notes: 'spurious — false positive' }),
    })
    const res = await postResolveDrift(req, {
      params: Promise.resolve({ id: 'd-reject' }),
    })
    expect(res.status).toBe(200)
    const updated = (
      await getFirestore().collection('schema_drift').doc('d-reject').get()
    ).data()!
    expect(updated.status).toBe('rejected')
  })

  it('accept opens a schema-bump PR via mocked GitHub API', async () => {
    await getFirestore()
      .collection('schema_drift')
      .doc('d-accept')
      .set({
        schema_id: 'mimes-polygon-detail',
        current_schema_version: 1,
        status: 'open',
        detected_at: Timestamp.now(),
        diff: {
          missing_required: ['Polygon_ID'],
          added_unknown: ['NewCol'],
          renamed_candidates: [],
          dropped_dynamic: [],
        },
      })

    const fileContent = Buffer.from(
      'export const schema = { schemaVersion: 1, map(row) {\n  return row;\n} }',
      'utf-8',
    ).toString('base64')

    const fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as URL | Request).toString()
      if (url.endsWith('/git/refs/heads/main')) {
        return new Response(JSON.stringify({ object: { sha: 'base-sha-123' } }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.endsWith('/git/refs')) {
        return new Response('{}', { status: 201 })
      }
      if (url.includes('/contents/scripts/pre-process/schemas/') && url.includes('?ref=')) {
        return new Response(JSON.stringify({ content: fileContent, sha: 'file-sha' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (url.includes('/contents/scripts/pre-process/schemas/')) {
        return new Response(
          JSON.stringify({ commit: { sha: 'new-commit-sha-abcdef' } }),
          { status: 201, headers: { 'content-type': 'application/json' } },
        )
      }
      if (url.endsWith('/pulls')) {
        return new Response(JSON.stringify({ number: 42 }), {
          status: 201,
          headers: { 'content-type': 'application/json' },
        })
      }
      throw new Error(`unmocked GitHub URL: ${url}`)
    })

    const req = new NextRequest('http://localhost/api/ops/drift/d-accept/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.5', 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'accept',
        new_schema_code: 'map(row) { return { polygon_id: row.Polygon_ID }; }',
        notes: 'happy path',
      }),
    })
    const res = await postResolveDrift(req, {
      params: Promise.resolve({ id: 'd-accept' }),
    })
    expect(res.status).toBe(200)
    const body = (await res.json()) as { pr_commit_sha: string; status: string }
    expect(body.status).toBe('accepted')
    expect(body.pr_commit_sha).toBe('new-commit-sha-abcdef')
    expect(fetchSpy).toHaveBeenCalledTimes(5) // ref, branch, file, commit, PR

    const updated = (
      await getFirestore().collection('schema_drift').doc('d-accept').get()
    ).data()!
    expect(updated.status).toBe('accepted')
    expect(updated.resolution_commit_sha).toBe('new-commit-sha-abcdef')
  })

  it('accept rejects when new_schema_code is missing', async () => {
    await getFirestore().collection('schema_drift').doc('d-no-code').set({
      status: 'open',
      detected_at: Timestamp.now(),
    })
    const req = new NextRequest('http://localhost/api/ops/drift/d-no-code/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.6', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    const res = await postResolveDrift(req, {
      params: Promise.resolve({ id: 'd-no-code' }),
    })
    expect(res.status).toBe(400)
  })

  it('accept surfaces 502 when GitHub returns non-ok', async () => {
    await getFirestore()
      .collection('schema_drift')
      .doc('d-gh-fail')
      .set({
        schema_id: 'mimes-polygon-detail',
        current_schema_version: 1,
        status: 'open',
        detected_at: Timestamp.now(),
        diff: {
          missing_required: [],
          added_unknown: [],
          renamed_candidates: [],
          dropped_dynamic: [],
        },
      })
    vi.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"message":"Bad credentials"}', { status: 401 }),
    )
    const req = new NextRequest('http://localhost/api/ops/drift/d-gh-fail/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.7', 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'accept',
        new_schema_code: 'map(row) { return row; }',
      }),
    })
    const res = await postResolveDrift(req, {
      params: Promise.resolve({ id: 'd-gh-fail' }),
    })
    expect(res.status).toBe(502)
  })

  it('400 on invalid action', async () => {
    await getFirestore().collection('schema_drift').doc('d2').set({ status: 'open' })
    const req = new NextRequest('http://localhost/api/ops/drift/d2/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.2', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'bogus' }),
    })
    const res = await postResolveDrift(req, { params: Promise.resolve({ id: 'd2' }) })
    expect(res.status).toBe(400)
  })

  it('404 on unknown ticket', async () => {
    const req = new NextRequest('http://localhost/api/ops/drift/nope/resolve', {
      method: 'POST',
      headers: { 'x-forwarded-for': '11.0.0.3', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    const res = await postResolveDrift(req, { params: Promise.resolve({ id: 'nope' }) })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/ops/discovered/[hash]/classify', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const db = getFirestore()
    for (const col of ['discovered_files', 'rate_limits']) {
      const snap = await db.collection(col).get()
      for (const d of snap.docs) await d.ref.delete()
    }
  })

  it('marks as ignored with reason', async () => {
    await getFirestore().collection('discovered_files').doc('abc').set({
      status: 'unrecognized',
    })
    const req = new NextRequest('http://localhost/api/ops/discovered/abc/classify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '12.0.0.1', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'ignore', reason: 'temp file' }),
    })
    const res = await postClassifyDiscovered(req, {
      params: Promise.resolve({ hash: 'abc' }),
    })
    expect(res.status).toBe(200)
    const doc = (await getFirestore().collection('discovered_files').doc('abc').get()).data()!
    expect(doc.status).toBe('ignored')
    expect(doc.ignored_reason).toBe('temp file')
  })

  it('marks as pending_converter with suggestion', async () => {
    await getFirestore().collection('discovered_files').doc('def').set({
      status: 'unrecognized',
    })
    const req = new NextRequest('http://localhost/api/ops/discovered/def/classify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '12.0.0.2', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'suggest-converter', suggested_converter: 'csv' }),
    })
    const res = await postClassifyDiscovered(req, {
      params: Promise.resolve({ hash: 'def' }),
    })
    expect(res.status).toBe(200)
    const doc = (await getFirestore().collection('discovered_files').doc('def').get()).data()!
    expect(doc.status).toBe('pending_converter')
    expect(doc.suggested_converter).toBe('csv')
  })

  it('400 on invalid action', async () => {
    await getFirestore().collection('discovered_files').doc('ghi').set({ status: 'unrecognized' })
    const req = new NextRequest('http://localhost/api/ops/discovered/ghi/classify', {
      method: 'POST',
      headers: { 'x-forwarded-for': '12.0.0.3', 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'delete' }),
    })
    const res = await postClassifyDiscovered(req, {
      params: Promise.resolve({ hash: 'ghi' }),
    })
    expect(res.status).toBe(400)
  })
})
