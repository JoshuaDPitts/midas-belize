import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import {
  rfactorDatasetIdForMonth,
  useRFactorForMonth,
  BELIZE_BOUNDS,
} from '@/lib/data/hooks/useRFactorForMonth';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('REQ-WS-025: useRFactorForMonth', () => {
  it('maps all 12 months to the expected dataset ids', () => {
    expect(rfactorDatasetIdForMonth(1)).toBe('rfactor-jan');
    expect(rfactorDatasetIdForMonth(2)).toBe('rfactor-feb');
    expect(rfactorDatasetIdForMonth(3)).toBe('rfactor-mar');
    expect(rfactorDatasetIdForMonth(4)).toBe('rfactor-apr');
    expect(rfactorDatasetIdForMonth(5)).toBe('rfactor-may');
    expect(rfactorDatasetIdForMonth(6)).toBe('rfactor-jun');
    expect(rfactorDatasetIdForMonth(7)).toBe('rfactor-jul');
    expect(rfactorDatasetIdForMonth(8)).toBe('rfactor-aug');
    expect(rfactorDatasetIdForMonth(9)).toBe('rfactor-sep');
    expect(rfactorDatasetIdForMonth(10)).toBe('rfactor-oct');
    expect(rfactorDatasetIdForMonth(11)).toBe('rfactor-nov');
    expect(rfactorDatasetIdForMonth(12)).toBe('rfactor-dec');
  });

  it('short-circuits when month is null (no fetch, all nulls)', async () => {
    const { result } = renderHook(() => useRFactorForMonth(null), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.rasterUrl).toBeNull();
    expect(result.current.bounds).toBeNull();
    expect(result.current.version).toBeNull();
  });

  it('returns the raster URL + Belize bbox + version for month=7', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('/api/ops/datasets/rfactor-jul')) {
        return jsonResponse({
          dataset: {
            status: 'published',
            current_version: {
              version: 'v2026-05-26-abc123',
              content_type: 'image/tiff; application=geotiff; profile=cloud-optimized',
              size_bytes: 282271614,
              gcs_path: 'rfactor-jul/v2026-05-26-abc123.tif',
            },
          },
        });
      }
      return jsonResponse({});
    });
    const { result } = renderHook(() => useRFactorForMonth(7), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rasterUrl).toBe('/api/data/rfactor-jul');
    expect(result.current.bounds).toEqual(BELIZE_BOUNDS);
    expect(result.current.version).toBe('v2026-05-26-abc123');
  });

  it('propagates upstream errors via .error', async () => {
    fetchMock.mockImplementation(async () =>
      new Response('boom', { status: 500 }),
    );
    const { result } = renderHook(() => useRFactorForMonth(3), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).not.toBeNull();
  });

  it('dispatches a different request for each month change', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      const match = url.match(/rfactor-([a-z]+)/);
      if (match) {
        return jsonResponse({
          dataset: {
            status: 'published',
            current_version: {
              version: `v-${match[1]}`,
              content_type: 'image/tiff',
              size_bytes: 1,
              gcs_path: `${match[0]}/v.tif`,
            },
          },
        });
      }
      return jsonResponse({});
    });
    const { result, rerender } = renderHook(({ m }) => useRFactorForMonth(m), {
      wrapper,
      initialProps: { m: 1 as 1 | 2 },
    });
    await waitFor(() => expect(result.current.version).toBe('v-jan'));
    rerender({ m: 2 });
    await waitFor(() => expect(result.current.version).toBe('v-feb'));
    expect(result.current.rasterUrl).toBe('/api/data/rfactor-feb');
  });
});
