import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { NextRequest } from 'next/server'
import { checkRateLimit } from '@/app/api/_lib/rateLimit'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

function mkReq(ip: string): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip },
  })
}

describe('checkRateLimit', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('rate_limits').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  it('allows requests under the limit', async () => {
    for (let i = 0; i < 10; i++) {
      const r = await checkRateLimit(mkReq('1.2.3.4'), {
        bucketSize: 10,
        windowMs: 60 * 60 * 1000,
      })
      expect(r.allowed).toBe(true)
    }
  })

  it('blocks the 11th request with retryAfter > 0', async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(mkReq('9.9.9.9'), { bucketSize: 10, windowMs: 60 * 60 * 1000 })
    }
    const blocked = await checkRateLimit(mkReq('9.9.9.9'), {
      bucketSize: 10,
      windowMs: 60 * 60 * 1000,
    })
    expect(blocked.allowed).toBe(false)
    expect(blocked.retryAfter).toBeGreaterThan(0)
    expect(blocked.remaining).toBe(0)
  })

  it('is per-IP isolated', async () => {
    for (let i = 0; i < 10; i++) {
      await checkRateLimit(mkReq('a.a.a.a'), { bucketSize: 10, windowMs: 60 * 60 * 1000 })
    }
    const otherIp = await checkRateLimit(mkReq('b.b.b.b'), {
      bucketSize: 10,
      windowMs: 60 * 60 * 1000,
    })
    expect(otherIp.allowed).toBe(true)
    expect(otherIp.remaining).toBe(9)
  })

  it('reports decreasing remaining quota', async () => {
    const ip = 'c.c.c.c'
    const opts = { bucketSize: 5, windowMs: 60 * 60 * 1000 }
    const r1 = await checkRateLimit(mkReq(ip), opts)
    const r2 = await checkRateLimit(mkReq(ip), opts)
    expect(r1.remaining).toBe(4)
    expect(r2.remaining).toBe(3)
  })

  it('handles missing x-forwarded-for by treating as a shared "unknown" bucket', async () => {
    const req1 = new NextRequest('http://localhost/api/test')
    const req2 = new NextRequest('http://localhost/api/test')
    const r1 = await checkRateLimit(req1, { bucketSize: 2, windowMs: 60_000 })
    const r2 = await checkRateLimit(req2, { bucketSize: 2, windowMs: 60_000 })
    const r3 = await checkRateLimit(req1, { bucketSize: 2, windowMs: 60_000 })
    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(false)
  })
})
