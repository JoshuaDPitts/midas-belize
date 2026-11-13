import { NextRequest, NextResponse } from 'next/server'
import { NotFoundError, ValidationError, RateLimitError, UpstreamError } from './errors'
import { sampleLogAccess } from './accessLog'

type RouteContext<P> = { params: Promise<P> }
type Handler<P> = (req: NextRequest, ctx: RouteContext<P>) => Promise<Response>

export function withRouteHandler<P = Record<string, string>>(
  handler: Handler<P>,
): Handler<P> {
  return async (req, ctx) => {
    sampleLogAccess().catch(() => {})
    try {
      return await handler(req, ctx)
    } catch (err) {
      if (err instanceof NotFoundError) return errResponse(404, 'NOT_FOUND', err.message)
      if (err instanceof ValidationError) {
        return errResponse(400, 'VALIDATION', err.message, err.details)
      }
      if (err instanceof RateLimitError) {
        return errResponse(429, 'RATE_LIMIT', err.message, { retryAfter: err.retryAfter })
      }
      if (err instanceof UpstreamError) return errResponse(502, 'UPSTREAM', err.message)
      console.error('[api] unhandled error:', err)
      return errResponse(500, 'INTERNAL', 'An unexpected error occurred')
    }
  }
}

function errResponse(status: number, code: string, message: string, details?: unknown) {
  const payload: { error: { code: string; message: string; details?: unknown } } = {
    error: { code, message },
  }
  if (details !== undefined) payload.error.details = details
  return NextResponse.json(payload, { status })
}
