export interface FetcherProvenance {
  source: string
  license: string
  citation: string
  version: string
}

export interface FetcherResult<T> {
  data: T
  version: string | null
  provenance: FetcherProvenance | null
  etag: string | null
}

export interface FetcherOpts {
  responseType?: 'json' | 'blob' | 'text'
}

export class FetcherError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message)
    this.name = 'FetcherError'
  }
}

function extractProvenance(headers: Headers): FetcherProvenance | null {
  const source = headers.get('X-Dataset-Source')
  const license = headers.get('X-Dataset-License')
  const citation = headers.get('X-Dataset-Citation')
  const version = headers.get('X-Dataset-Version')
  if (!source || !license || !citation || !version) return null
  // All provenance headers are URL-encoded on the server side to survive
  // ByteString-only HTTP header serialization (em dashes, curly quotes,
  // accented characters in real provenance strings).
  return {
    source: decodeURIComponent(source),
    license: decodeURIComponent(license),
    citation: decodeURIComponent(citation),
    version,
  }
}

export async function dataFetcher<T = unknown>(
  url: string,
  opts: FetcherOpts = {},
): Promise<FetcherResult<T>> {
  const res = await fetch(url)
  if (!res.ok) {
    let code = 'UNKNOWN'
    let message = res.statusText
    let details: unknown
    try {
      const body = await res.json()
      if (body?.error) {
        code = body.error.code
        message = body.error.message
        details = body.error.details
      }
    } catch {
      /* body isn't JSON */
    }
    throw new FetcherError(res.status, code, message, details)
  }

  const etag = res.headers.get('ETag')?.replace(/^"|"$/g, '') ?? null
  const version = res.headers.get('X-Dataset-Version') ?? etag
  const provenance = extractProvenance(res.headers)

  let data: T
  switch (opts.responseType) {
    case 'blob':
      data = (await res.blob()) as T
      break
    case 'text':
      data = (await res.text()) as T
      break
    case 'json':
    default:
      data = (await res.json()) as T
  }

  return { data, version, provenance, etag }
}
