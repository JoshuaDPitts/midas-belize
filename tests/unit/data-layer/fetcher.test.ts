import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dataFetcher } from '@/lib/data/cache/fetcher'

describe('dataFetcher', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('parses JSON response body', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ hello: 'world' }), {
        headers: {
          'Content-Type': 'application/json',
          ETag: '"v2026-04-22-abc1234"',
        },
      }),
    )
    const { data, version } = await dataFetcher<{ hello: string }>('/api/test')
    expect(data).toEqual({ hello: 'world' })
    expect(version).toBe('v2026-04-22-abc1234')
  })

  it('extracts provenance headers into provenance object', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), {
        headers: {
          'Content-Type': 'application/json',
          'X-Dataset-Source': 'MIDAS 2026',
          'X-Dataset-License': 'CC-BY-4.0',
          'X-Dataset-Citation': encodeURIComponent('Author et al. (2026)'),
          'X-Dataset-Version': 'v2026-04-22-abc1234',
        },
      }),
    )
    const { provenance } = await dataFetcher('/api/test')
    expect(provenance).toEqual({
      source: 'MIDAS 2026',
      license: 'CC-BY-4.0',
      citation: 'Author et al. (2026)',
      version: 'v2026-04-22-abc1234',
    })
  })

  it('returns null provenance when headers missing', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({}), { headers: { 'Content-Type': 'application/json' } }),
    )
    const { provenance } = await dataFetcher('/api/test')
    expect(provenance).toBeNull()
  })

  it('parses binary response as Blob', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(bytes, { headers: { 'Content-Type': 'application/geo+json' } }),
    )
    const { data } = await dataFetcher<Blob>('/api/data/x', { responseType: 'blob' })
    expect(data).toBeInstanceOf(Blob)
  })

  it('throws on non-ok response with an Error carrying status', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'missing' } }), {
        status: 404,
      }),
    )
    await expect(dataFetcher('/api/missing')).rejects.toMatchObject({ status: 404 })
  })
})
