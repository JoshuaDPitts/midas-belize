'use client';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { buildLayerConfigsForSite } from '../map/MarineMapLayers';
import { usePolygonGeoJson, type MarinePolygonFeature } from '../map/usePolygonGeoJson';
import { useEbinCladePerPolygon, type MarineSite } from '../map/useEbinCladePerPolygon';

export interface MarineSiteAggregate {
  siteLabel: string;
  polygonCount: number;
  avgNbSScore: number | null;
  totalBiomass: number | null;
  topClades: Array<{ index: number; share: number }>;
  /** NbS scores for all polygons at the active site — used by NbSScoreCard histogram. */
  siteScores: number[];
  loading: boolean;
}

const SITE_LABELS: Record<string, string> = {
  placencia: 'Placencia',
  'caye-caulker': 'Caye Caulker',
  'laughing-bird': 'Laughing Bird Caye',
};

export function useMarineSiteAggregate(): MarineSiteAggregate {
  const activeSite = useAtomValue(activeSiteAtom);
  const configs = buildLayerConfigsForSite(activeSite as 'placencia' | 'caye-caulker' | null);

  // Bounded slot pattern matching MarineMapLayers (max 3 configs per site).
  const geo0 = usePolygonGeoJson(configs[0]?.datasetId ?? null);
  const geo1 = usePolygonGeoJson(configs[1]?.datasetId ?? null);
  const geo2 = usePolygonGeoJson(configs[2]?.datasetId ?? null);
  const fetched = [geo0, geo1, geo2];

  const cladeLookup = useEbinCladePerPolygon(
    typeof activeSite === 'string' && (activeSite === 'placencia' || activeSite === 'caye-caulker')
      ? (activeSite as MarineSite)
      : null,
  );

  return useMemo(() => {
    const features: MarinePolygonFeature[] = fetched.flatMap((r) => (r.data?.features ?? []) as MarinePolygonFeature[]);
    const loading = fetched.some((r) => r.isLoading) || cladeLookup.loading;
    const nbsValues = features.map((f) => f.properties?.NbS_Score).filter((v): v is number => typeof v === 'number');
    const avgNbSScore = nbsValues.length > 0 ? nbsValues.reduce((a, b) => a + b, 0) / nbsValues.length : null;

    // Clade totals come from the ebin-clade-detail per-polygon aggregation —
    // the `*-nbs-scores` features fetched above never carry Clade_N_pct columns,
    // so a polygon's clade contribution lives only in its aggregated ebin row.
    const cladeTotals: Record<number, number> = {};
    for (const family of ['marine-polygons', 'coast-polygons', 'polygon-grid'] as const) {
      const familyMap = cladeLookup.byFamily[family];
      for (const agg of familyMap.values()) {
        for (let i = 0; i < agg.clades.length; i++) {
          const v = agg.clades[i];
          if (v > 0) cladeTotals[i + 1] = (cladeTotals[i + 1] ?? 0) + v;
        }
      }
    }
    const topClades = Object.entries(cladeTotals)
      .map(([k, v]) => ({ index: Number(k), share: v }))
      .sort((a, b) => b.share - a.share)
      .slice(0, 3);

    return {
      siteLabel: typeof activeSite === 'string' ? SITE_LABELS[activeSite] ?? activeSite : 'Belize-wide',
      polygonCount: features.length,
      avgNbSScore,
      totalBiomass: null, // wired when biomass dataset publishes
      topClades,
      siteScores: nbsValues,
      loading,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo0.data, geo1.data, geo2.data, geo0.isLoading, geo1.isLoading, geo2.isLoading, activeSite, cladeLookup]);
}
