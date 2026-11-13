import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { useScenarios } from '@/lib/data/hooks/useScenarios'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useScenarios', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns scenarios array for a valid site', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          site: 'placencia',
          scenarios: [{ id: 'baseline' }, { id: 'rcp45' }],
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { result } = renderHook(() => useScenarios('placencia'), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.scenarios.map((s) => s.id)).toEqual(['baseline', 'rcp45'])
    expect(result.current.error).toBeNull()
  })

  it('returns empty + idle when site is null', () => {
    const { result } = renderHook(() => useScenarios(null), { wrapper })
    expect(result.current.loading).toBe(false)
    expect(result.current.scenarios).toEqual([])
  })

  it('does not call fetch when site is null', () => {
    const fetchSpy = vi.mocked(global.fetch)
    renderHook(() => useScenarios(null), { wrapper })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
