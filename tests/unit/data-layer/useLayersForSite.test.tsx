import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { useLayersForSite } from '@/lib/data/hooks/useLayersForSite'
import type { SiteId } from '@/lib/data/types'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useLayersForSite', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetches /api/layers/{site} and returns layers array', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ site: 'placencia', layers: [{ id: 'a' }, { id: 'b' }] }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { result } = renderHook(() => useLayersForSite('placencia'), { wrapper })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.layers.map((l) => l.id)).toEqual(['a', 'b'])
    expect(result.current.error).toBeNull()
  })

  it('passes ?domain=<tag> when provided', async () => {
    const fetchSpy = vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ site: 'placencia', layers: [] }), {
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const { result } = renderHook(
      () => useLayersForSite('placencia', { domain: 'marine' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('domain=marine'))
  })

  it('returns error on non-ok response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ error: { code: 'VALIDATION', message: 'bad site' } }),
        { status: 400 },
      ),
    )
    const { result } = renderHook(() => useLayersForSite('bogus' as SiteId), {
      wrapper,
    })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.layers).toEqual([])
  })

  it('returns empty layers + loading=false when site is null', () => {
    const { result } = renderHook(() => useLayersForSite(null), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.layers).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it('does not call fetch when site is null', () => {
    const fetchSpy = vi.mocked(global.fetch)
    renderHook(() => useLayersForSite(null), { wrapper })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
