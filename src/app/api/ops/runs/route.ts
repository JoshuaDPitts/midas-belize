import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'

export const GET = withRouteHandler(async (req: NextRequest) => {
  const limit = Math.min(200, Number(req.nextUrl.searchParams.get('limit') ?? 50))
  const snap = await db
    .collection('pipeline_runs')
    .orderBy('started_at', 'desc')
    .limit(limit)
    .get()
  const runs = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ runs }, { status: 200, headers: { 'Cache-Control': 'no-cache' } })
})
