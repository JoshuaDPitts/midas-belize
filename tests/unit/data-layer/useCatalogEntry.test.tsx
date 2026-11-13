import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { useCatalogEntry } from '@/lib/data/hooks/useCatalogEntry'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useCatalogEntry', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('fetches a single catalog entry + versions', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          dataset: { id: 'x', status: 'published' },
          versions: [{ version: 'v1', is_current: true }],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { result } = renderHook(() => useCatalogEntry('x'), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.entry?.id).toBe('x')
    expect(result.current.versions).toHaveLength(1)
  })

  it('is idle when id is null', () => {
    const { result } = renderHook(() => useCatalogEntry(null), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.entry).toBeNull()
    expect(result.current.versions).toEqual([])
  })

  it('does not call fetch when id is null', () => {
    const fetchSpy = vi.mocked(global.fetch)
    renderHook(() => useCatalogEntry(null), { wrapper })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
