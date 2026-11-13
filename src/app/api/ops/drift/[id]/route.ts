import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError } from '@/app/api/_lib/errors'

export const GET = withRouteHandler<{ id: string }>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params
  const snap = await db.collection('schema_drift').doc(id).get()
  if (!snap.exists) throw new NotFoundError(`drift ticket ${id} not found`)
  return NextResponse.json(
    { drift: { id: snap.id, ...snap.data() } },
    { status: 200, headers: { 'Cache-Control': 'no-cache' } },
  )
})
