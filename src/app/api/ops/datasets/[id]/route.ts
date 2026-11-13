import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError } from '@/app/api/_lib/errors'

export const GET = withRouteHandler<{ id: string }>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params
  const snap = await db.collection('datasets').doc(id).get()
  if (!snap.exists) throw new NotFoundError(`dataset ${id} not found`)

  const versionsSnap = await snap.ref
    .collection('versions')
    .orderBy('published_at', 'desc')
    .limit(20)
    .get()
  const versions = versionsSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

  return NextResponse.json(
    { dataset: { id: snap.id, ...snap.data() }, versions },
    { status: 200, headers: { 'Cache-Control': 'no-cache' } },
  )
})
