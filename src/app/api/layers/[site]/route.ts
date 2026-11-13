import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { ValidationError } from '@/app/api/_lib/errors'
import type { CatalogEntry, SiteId } from '@/lib/data/types'

const SITES: SiteId[] = ['placencia', 'caye-caulker', 'laughing-bird']

export const GET = withRouteHandler<{ site: string }>(async (req: NextRequest, ctx) => {
  const { site: siteParam } = await ctx.params
  if (!SITES.includes(siteParam as SiteId)) {
    throw new ValidationError(`invalid site: ${siteParam}`)
  }
  const site = siteParam as SiteId
  const domain = req.nextUrl.searchParams.get('domain')

  const snap = await db
    .collection('datasets')
    .where('visible_at', 'array-contains', site)
    .where('status', '==', 'published')
    .orderBy('updated_at', 'desc')
    .get()

  const layers = snap.docs
    .map((d) => d.data() as CatalogEntry)
    // DEC-021: Firestore permits only one array-contains per query, so
    // tags filtering happens here after the visible_at + status query.
    .filter((e) => !domain || (Array.isArray(e.tags) && e.tags.includes(domain)))
    .map((e) => ({
      id: e.id,
      layer: e.layer,
      title: e.title,
      description: e.description,
      family: e.family,
      scope: e.scope,
      tags: e.tags,
      bbox: e.current_version?.bbox ?? null,
      temporal_extent: e.current_version?.temporal_extent ?? null,
      data_url: `/api/data/${encodeURIComponent(e.id)}`,
      current_version: e.current_version?.version ?? null,
      provenance: e.provenance,
    }))

  return NextResponse.json(
    { site, layers },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600',
      },
    },
  )
})
