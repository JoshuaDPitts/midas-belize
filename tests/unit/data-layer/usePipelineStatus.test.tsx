import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { usePipelineStatus } from '@/lib/data/hooks/usePipelineStatus'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

function respond(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('usePipelineStatus', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns runs + datasets from the two endpoints', async () => {
    vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/ops/runs')) {
        return Promise.resolve(respond({ runs: [{ id: 'r1' }] }))
      }
      if (url.includes('/api/ops/datasets')) {
        return Promise.resolve(respond({ datasets: [{ id: 'd1' }] }))
      }
      return Promise.reject(new Error(`unmocked url: ${url}`))
    })

    const { result } = renderHook(() => usePipelineStatus(), { wrapper })
    await waitFor(() => expect(result.current.loading).toBe(false))
    const runIds = result.current.runs.map((r) => (r as unknown as { id: string }).id)
    const datasetIds = result.current.datasets.map((d) => d.id)
    expect(runIds).toEqual(['r1'])
    expect(datasetIds).toEqual(['d1'])
  })

  it('passes limit to the runs endpoint', async () => {
    const fetchSpy = vi.mocked(global.fetch).mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/ops/runs')) return Promise.resolve(respond({ runs: [] }))
      if (url.includes('/api/ops/datasets')) return Promise.resolve(respond({ datasets: [] }))
      return Promise.reject(new Error('unmocked'))
    })
    renderHook(() => usePipelineStatus({ limit: 10 }), { wrapper })
    await waitFor(() => {
      expect(
        fetchSpy.mock.calls.some((call) => String(call[0]).includes('limit=10')),
      ).toBe(true)
    })
  })
})
