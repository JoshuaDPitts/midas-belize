import { NextRequest } from 'next/server'
import { Readable } from 'node:stream'
import { createGzip } from 'node:zlib'
import { db, bucket } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError } from '@/app/api/_lib/errors'
import { provenanceHeaders } from '@/app/api/_lib/provenanceHeaders'
import type { CatalogEntry } from '@/lib/data/types'

export const GET = withRouteHandler<{ dataset: string }>(async (req: NextRequest, ctx) => {
  const { dataset: datasetId } = await ctx.params
  const snap = await db.collection('datasets').doc(datasetId).get()
  if (!snap.exists) throw new NotFoundError(`dataset ${datasetId} not found`)

  const entry = snap.data() as CatalogEntry
  if (entry.status !== 'published' || !entry.current_version) {
    throw new NotFoundError(`dataset ${datasetId} is not published`)
  }

  const file = bucket.file(entry.current_version.gcs_path)
  const [exists] = await file.exists()
  if (!exists) {
    throw new NotFoundError(`backing object missing: ${entry.current_version.gcs_path}`)
  }

  // The SSR runtime is a Cloud Function (2nd gen) with a hard 32 MiB HTTP
  // response cap. Several published GeoJSON datasets exceed that (the national
  // watersheds clade-detail is ~54 MiB), so proxying them raw 500s at the
  // platform layer. gzip-encoding the body keeps the emitted payload well under
  // the cap (GeoJSON compresses ~10x) while staying behind this route's
  // provenance/cache/access semantics. Negotiated on Accept-Encoding so clients
  // that don't advertise gzip still get identity bytes.
  const acceptsGzip = /\bgzip\b/.test(req.headers.get('accept-encoding') ?? '')

  const nodeStream = file.createReadStream()
  const bodyStream = acceptsGzip ? nodeStream.pipe(createGzip()) : nodeStream
  const webStream = Readable.toWeb(bodyStream) as unknown as ReadableStream

  const headers: Record<string, string> = {
    'Content-Type': entry.current_version.content_type,
    // Track H content_hash fix (Session 39, 2026-05-14) now includes
    // asset.bytes — so the etag actually changes when output bytes change.
    // That lifted the "must-revalidate every 5 min" workaround. We can now
    // serve from CDN cache aggressively: short browser cache, long CDN
    // cache, with stale-while-revalidate so the user never blocks on
    // revalidation. Background refresh closes the loop within an hour
    // of any catalog re-publish.
    'Cache-Control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    // Explicit Vary suppresses Firebase Hosting's default
    // `Vary: cookie, need-authorization` which fragments the CDN cache
    // per browser session and kills cross-user cache reuse. This route
    // is content-versioned + 100% public-safe — it never reads cookies.
    // Accept-Encoding keeps the gzip and identity variants cached separately.
    Vary: 'Accept-Encoding',
    ETag: `"${entry.current_version.version}"`,
    ...provenanceHeaders(entry),
  }
  if (acceptsGzip) {
    headers['Content-Encoding'] = 'gzip'
  } else {
    // Only the identity response has a known length up front.
    headers['Content-Length'] = String(entry.current_version.size_bytes)
  }

  return new Response(webStream, { status: 200, headers })
})
