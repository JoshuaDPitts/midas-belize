import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { ValidationError } from '@/app/api/_lib/errors'
import { isActiveSite } from '@/../scripts/pre-process/sites'

export const GET = withRouteHandler<{ site: string }>(async (_req: NextRequest, ctx) => {
  const { site } = await ctx.params
  if (!isActiveSite(site)) {
    throw new ValidationError(`invalid site: ${site}`)
  }

  const snap = await db
    .collection('scenarios')
    .where('site', '==', site)
    .orderBy('created_at', 'desc')
    .get()

  const scenarios = snap.docs.map((d) => d.data())

  return NextResponse.json(
    { site, scenarios },
    {
      status: 200,
      headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200' },
    },
  )
})
