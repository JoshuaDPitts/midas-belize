import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'

export const GET = withRouteHandler(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get('status') ?? 'unrecognized'
  const snap = await db
    .collection('discovered_files')
    .where('status', '==', status)
    .orderBy('last_seen', 'desc')
    .get()
  const discovered = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json(
    { discovered },
    { status: 200, headers: { 'Cache-Control': 'no-cache' } },
  )
})
