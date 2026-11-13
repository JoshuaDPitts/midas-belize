import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';
import {
  useWatershedsForSite,
  joinedPayloadToRows,
} from '@/lib/data/hooks/useWatershedsForSite';
import polygons from '../../_fixtures/watershed/sample-polygons.json';
import nbs from '../../_fixtures/watershed/sample-nbs.json';

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

describe('REQ-WS-004: useWatershedsForSite', () => {
  it('fetches placencia-watershed-polygons for placencia', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('placencia-watershed-polygons')) return jsonResponse(polygons);
      if (url.includes('placencia-watersheds-nbs-scores')) return jsonResponse(nbs);
      return jsonResponse({ rows: [] });
    });
    const { result } = renderHook(() => useWatershedsForSite('placencia'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.geometry?.features.length).toBe(2);
  });

  it('returns null geometry for laughing-bird (offshore)', async () => {
    const { result } = renderHook(() => useWatershedsForSite('laughing-bird'), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.geometry).toBeNull();
    expect(result.current.joinedAttrs).toBeNull();
  });

  it('falls back to watersheds-all-* for caye-caulker joined attrs', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('cayecaulker-watershed-polygons')) return jsonResponse(polygons);
      if (url.includes('watersheds-all-nbs-scores')) return jsonResponse(nbs);
      if (url.includes('watersheds-all-ebin-clade-detail')) return jsonResponse({ rows: [] });
      return jsonResponse({});
    });
    const { result } = renderHook(() => useWatershedsForSite('caye-caulker'), { wrapper });
    await waitFor(() => expect(result.current.joinedAttrs).not.toBeNull());
    expect(result.current.joinedAttrs?.nbs.length).toBe(2);
  });

  it('uses watersheds-utm-shape national geometry when site is null', async () => {
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('watersheds-utm-shape')) return jsonResponse(polygons);
      if (url.includes('watersheds-all-nbs-scores')) return jsonResponse(nbs);
      if (url.includes('watersheds-all-ebin-clade-detail')) return jsonResponse({ rows: [] });
      return jsonResponse({});
    });
    const { result } = renderHook(() => useWatershedsForSite(null), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.geometry?.features.length).toBe(2);
  });

  it('normalises FeatureCollection joined payloads to row arrays', async () => {
    // Prod payload for `placencia-watersheds-nbs-scores` is a FeatureCollection
    // (NbS scores live in each feature's `properties`), not a `{rows: [...]}`
    // envelope. The hook previously read `payload.rows` and silently zeroed
    // out joinedAttrs, leaving the map encoders falling back to muted gray.
    const featureCollectionNbs: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { Name: 'Big Creek', NbS_Score: 0.62, Conservation_Value: 0.71 },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [0, 0] },
          properties: { Name: 'Sennis', NbS_Score: 0.41, Conservation_Value: 0.52 },
        },
      ],
    };
    fetchMock.mockImplementation(async (url: string) => {
      if (url.includes('placencia-watershed-polygons')) return jsonResponse(polygons);
      if (url.includes('placencia-watersheds-nbs-scores'))
        return jsonResponse(featureCollectionNbs);
      if (url.includes('placencia-watersheds-ebin-clade-detail'))
        return jsonResponse({ rows: [] });
      return jsonResponse({});
    });
    const { result } = renderHook(() => useWatershedsForSite('placencia'), { wrapper });
    await waitFor(() => expect(result.current.joinedAttrs).not.toBeNull());
    expect(result.current.joinedAttrs?.nbs.length).toBe(2);
    expect(result.current.joinedAttrs?.nbs[0].NbS_Score).toBe(0.62);
  });

  describe('joinedPayloadToRows', () => {
    it('returns rows from the {rows} envelope', () => {
      expect(joinedPayloadToRows({ rows: [{ Name: 'A' }] }).map((r) => r.Name)).toEqual(['A']);
    });

    it('extracts feature.properties from a FeatureCollection', () => {
      const fc: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { Name: 'B' } },
        ],
      };
      expect(joinedPayloadToRows(fc).map((r) => r.Name)).toEqual(['B']);
    });

    it('returns empty array for null / unknown shapes', () => {
      expect(joinedPayloadToRows(null)).toEqual([]);
      expect(joinedPayloadToRows({} as never)).toEqual([]);
    });
  });
});
