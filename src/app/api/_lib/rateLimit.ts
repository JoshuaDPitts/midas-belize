import crypto from 'node:crypto'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '@/lib/data/firebase-admin'
import { NextRequest } from 'next/server'

export interface RateLimitOpts {
  bucketSize: number
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  retryAfter: number
  remaining: number
}

function hashIp(ip: string): string {
  return crypto.createHash('sha1').update(ip).digest('hex').slice(0, 16)
}

function extractIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) return xff.split(',')[0].trim()
  return 'unknown'
}

export async function checkRateLimit(
  req: NextRequest,
  opts: RateLimitOpts,
): Promise<RateLimitResult> {
  const ipHash = hashIp(extractIp(req))
  const ref = db.collection('rate_limits').doc(ipHash)
  const now = Date.now()
  const cutoff = now - opts.windowMs

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const existing = snap.exists ? (snap.data() as { hits?: number[] }) : { hits: [] }
    const hits = (existing.hits ?? []).filter((t) => t >= cutoff)

    if (hits.length >= opts.bucketSize) {
      const oldest = hits[0]
      const retryAfter = Math.ceil((oldest + opts.windowMs - now) / 1000)
      return { allowed: false, retryAfter: Math.max(1, retryAfter), remaining: 0 }
    }

    hits.push(now)
    tx.set(ref, { hits, last_seen: Timestamp.now() }, { merge: true })
    return { allowed: true, retryAfter: 0, remaining: opts.bucketSize - hits.length }
  })
}
