import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'

export const GET = withRouteHandler(async (req: NextRequest) => {
  const status = req.nextUrl.searchParams.get('status')
  const baseQuery = status
    ? db.collection('datasets').where('status', '==', status)
    : db.collection('datasets')
  const snap = await baseQuery.orderBy('updated_at', 'desc').get()
  const datasets = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  return NextResponse.json({ datasets }, { status: 200, headers: { 'Cache-Control': 'no-cache' } })
})
