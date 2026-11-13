import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError, RateLimitError, ValidationError } from '@/app/api/_lib/errors'
import { checkRateLimit } from '@/app/api/_lib/rateLimit'

const RATE_OPTS = { bucketSize: 10, windowMs: 60 * 60 * 1000 }

interface ClassifyBody {
  action?: string
  reason?: string
  suggested_converter?: string
}

export const POST = withRouteHandler<{ hash: string }>(async (req: NextRequest, ctx) => {
  const rl = await checkRateLimit(req, RATE_OPTS)
  if (!rl.allowed) throw new RateLimitError('discovered-classify quota exceeded', rl.retryAfter)

  const body = (await req.json().catch(() => ({}))) as ClassifyBody
  if (body.action !== 'ignore' && body.action !== 'suggest-converter') {
    throw new ValidationError('action must be one of: ignore, suggest-converter')
  }

  const { hash } = await ctx.params
  const ref = db.collection('discovered_files').doc(hash)
  const snap = await ref.get()
  if (!snap.exists) throw new NotFoundError(`discovered file ${hash} not found`)

  if (body.action === 'ignore') {
    await ref.update({
      status: 'ignored',
      ignored_reason: body.reason ?? null,
      last_seen: Timestamp.now(),
    })
  } else {
    await ref.update({
      status: 'pending_converter',
      suggested_converter: body.suggested_converter ?? null,
      last_seen: Timestamp.now(),
    })
  }

  return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-cache' } })
})
