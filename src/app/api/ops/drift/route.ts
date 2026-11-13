import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'

export const GET = withRouteHandler(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get('status') ?? 'open'
  const snap = await db
    .collection('schema_drift')
    .where('status', '==', status)
    .orderBy('detected_at', 'desc')
    .get()
  const drift = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ drift }, { status: 200, headers: { 'Cache-Control': 'no-cache' } })
})
