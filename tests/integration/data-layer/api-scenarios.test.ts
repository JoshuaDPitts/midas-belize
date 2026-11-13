import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/scenarios/[site]/route'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

interface ScenarioDoc {
  id: string
  site: string
  name: string
}

describe('GET /api/scenarios/[site]', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('scenarios').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  async function seed(id: string, site: string, name: string) {
    await getFirestore().collection('scenarios').doc(id).set({
      id,
      site,
      name,
      description: `Scenario ${name}`,
      parameters: { sst_anomaly: 0, slr_cm: 0, rcp: null },
      time_range: { start: '2015-01', end: '2024-12' },
      created_at: Timestamp.now(),
    })
  }

  it('returns scenarios scoped to the requested site', async () => {
    await seed('baseline', 'placencia', 'Baseline')
    await seed('rcp45', 'placencia', 'RCP 4.5')
    await seed('cc-baseline', 'caye-caulker', 'Baseline')

    const req = new NextRequest('http://localhost/api/scenarios/placencia')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.site).toBe('placencia')
    expect(body.scenarios.map((s: ScenarioDoc) => s.id).sort()).toEqual(['baseline', 'rcp45'])
  })

  it('returns empty scenarios list when none seeded for site', async () => {
    const req = new NextRequest('http://localhost/api/scenarios/placencia')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.scenarios).toEqual([])
  })

  it('400 for invalid site id', async () => {
    const req = new NextRequest('http://localhost/api/scenarios/not-a-site')
    const res = await GET(req, { params: Promise.resolve({ site: 'not-a-site' }) })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION')
  })

  it('sets cache-control with max-age=3600 + SWR', async () => {
    const req = new NextRequest('http://localhost/api/scenarios/placencia')
    const res = await GET(req, { params: Promise.resolve({ site: 'placencia' }) })
    const cc = res.headers.get('Cache-Control')
    expect(cc).toContain('max-age=3600')
    expect(cc).toContain('stale-while-revalidate=7200')
  })
})
