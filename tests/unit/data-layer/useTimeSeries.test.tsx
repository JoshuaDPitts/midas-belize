import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'
import type { ReactNode } from 'react'
import { useTimeSeries } from '@/lib/data/hooks/useTimeSeries'

const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
)

describe('useTimeSeries', () => {
  beforeEach(() => {
    global.fetch = vi.fn()
  })

  it('returns time_axis + polygons for valid scenario+metric', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          dataset_id: 'x',
          scenario: 'baseline',
          metric: 'coral',
          time_axis: ['2015-01', '2015-02'],
          polygons: [{ polygon_id: 1, values: [0.7, 0.72] }],
          provenance: {
            source: 's',
            source_url: null,
            license: 'l',
            citation: 'c',
            upstream_paths: ['x'],
          },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
    const { result } = renderHook(
      () => useTimeSeries('x', { scenario: 'baseline', metric: 'coral' }),
      { wrapper },
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data?.time_axis).toEqual(['2015-01', '2015-02'])
    expect(result.current.data?.polygons).toHaveLength(1)
    expect(result.current.data?.polygons[0].values).toEqual([0.7, 0.72])
  })

  it('is idle (loading=false, data=null) when scenario is empty', () => {
    const { result } = renderHook(
      () => useTimeSeries('x', { scenario: '', metric: 'coral' }),
      { wrapper },
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('is idle when metric is empty', () => {
    const { result } = renderHook(
      () => useTimeSeries('x', { scenario: 'baseline', metric: '' }),
      { wrapper },
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('is idle when datasetId is null', () => {
    const { result } = renderHook(
      () => useTimeSeries(null, { scenario: 'baseline', metric: 'coral' }),
      { wrapper },
    )
    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })

  it('does not call fetch when any input is missing', () => {
    const fetchSpy = vi.mocked(global.fetch)
    renderHook(() => useTimeSeries(null, { scenario: 'baseline', metric: 'coral' }), {
      wrapper,
    })
    renderHook(() => useTimeSeries('x', { scenario: '', metric: 'coral' }), { wrapper })
    renderHook(() => useTimeSeries('x', { scenario: 'baseline', metric: '' }), { wrapper })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('URL-encodes both scenario and metric', async () => {
    const fetchSpy = vi.mocked(global.fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          dataset_id: 'x',
          scenario: 'baseline+1',
          metric: 'coral/cover',
          time_axis: [],
          polygons: [],
          provenance: { source: 's', source_url: null, license: 'l', citation: 'c', upstream_paths: [] },
        }),
        { headers: { 'Content-Type': 'application/json' } },
      ),
    )
    renderHook(
      () => useTimeSeries('x', { scenario: 'baseline+1', metric: 'coral/cover' }),
      { wrapper },
    )
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    const url = String(fetchSpy.mock.calls[0][0])
    expect(url).toContain('scenario=baseline%2B1')
    expect(url).toContain('metric=coral%2Fcover')
  })
})
