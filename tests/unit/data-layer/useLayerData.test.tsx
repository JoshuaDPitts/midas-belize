import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { useLayerData } from '@/lib/data/hooks/useLayerData'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useLayerData', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns loading=true initially, then data', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), {
        headers: {
          'Content-Type': 'application/geo+json',
          'X-Dataset-Source': 'src',
          'X-Dataset-License': 'lic',
          'X-Dataset-Citation': encodeURIComponent('cit'),
          'X-Dataset-Version': 'v2026-04-22-abc1234',
        },
      }),
    )
    const { result } = renderHook(() => useLayerData('placencia-site'), { wrapper })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data).toEqual({ type: 'FeatureCollection', features: [] })
    expect(result.current.version).toBe('v2026-04-22-abc1234')
    expect(result.current.provenance?.source).toBe('src')
  })

  it('returns error on non-ok response', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: 'NOT_FOUND', message: 'no' } }), {
        status: 404,
      }),
    )
    const { result } = renderHook(() => useLayerData('missing'), { wrapper })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.data).toBeNull()
  })
})
