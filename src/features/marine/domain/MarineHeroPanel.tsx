'use client';
import { useEffect, useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { activeSiteAtom, selectedPolygonAtom, inspectedFeatureAtom } from '@/atoms';
import { buildLayerConfigsForSite } from '../map/MarineMapLayers';
import { usePolygonGeoJson } from '../map/usePolygonGeoJson';
import { useMarineSiteAggregate } from './useMarineSiteAggregate';
import { useMarineDataForPolygon } from './useMarineDataForPolygon';
import { useFoodwebData } from './useFoodwebData';
import { SiteAggregateCard } from './SiteAggregateCard';
import { PolygonFocusCard } from './PolygonFocusCard';
import { FoodWebDiagram } from './FoodWebDiagram';
import { SecondaryAccordion } from './SecondaryAccordion';
import { NbSScoreCard } from './NbSScoreCard';
import { MarineCrossSignalsProvider } from './MarineCrossSignals';
import styles from './MarineHeroPanel.module.css';

// ---------------------------------------------------------------------------
// No placeholder / fallback data. Per user directive 2026-05-12: if a
// viz component lacks real wiring, hide it or render an explicit empty
// state — never synthesize fake data. See feedback_no_placeholders.md.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Bridge: selectedPolygonAtom → inspectedFeatureAtom
//
// PolygonFocusCard, NbSScoreCard etc. read inspectedFeatureAtom (the v1 atom
// that holds a full FeatureHit). selectedPolygonAtom is the v1.5 lightweight
// ref ({layerId, featureId}). This component resolves the full feature geometry
// from the SWR cache (same cache used by MarineMapLayers) and writes it into
// inspectedFeatureAtom so v1 components continue to work seamlessly.
// ---------------------------------------------------------------------------

function useSelectedPolygonBridge() {
  const selected = useAtomValue(selectedPolygonAtom);
  const activeSite = useAtomValue(activeSiteAtom);
  const setInspected = useSetAtom(inspectedFeatureAtom);

  // Resolve layer config for the selected polygon's layer.
  const configs = buildLayerConfigsForSite(activeSite as 'placencia' | 'caye-caulker' | null);
  const matchConfig = selected ? configs.find((c) => c.datasetId === selected.layerId) : null;

  // Fetch GeoJSON from the SWR cache (no-op when datasetId is null).
  const geoResult = usePolygonGeoJson(matchConfig?.datasetId ?? null);

  useEffect(() => {
    if (!selected) {
      setInspected(null);
      return;
    }
    const feature = geoResult.data?.features?.find((f) => {
      const props = f.properties as Record<string, unknown>;
      const id =
        props.MIMES_ID ??
        props.id ??
        props.ID ??
        props.GRID_ID ??
        props.Name;
      return String(id).replace(/\.0+$/, '') === String(selected.featureId).replace(/\.0+$/, '');
    });
    if (feature) {
      setInspected({
        layerId: selected.layerId,
        featureId: selected.featureId,
        properties: feature.properties as Record<string, unknown>,
        lngLat: [0, 0],
      });
    }
  }, [selected, geoResult.data, setInspected]);
}

// ---------------------------------------------------------------------------
// Focused-mode inner component — derives props for v1 components.
// ---------------------------------------------------------------------------

function FocusedContent({ siteScores }: { siteScores: number[] }) {
  const { feature, polygonKey } = useMarineDataForPolygon();
  const foodweb = useFoodwebData();

  const props = (feature?.properties ?? {}) as Record<string, unknown>;
  const restoration = typeof props.Restoration_Potential === 'number' ? props.Restoration_Potential : null;
  const conservation = typeof props.Conservation_Value === 'number' ? props.Conservation_Value : null;
  const nbs = typeof props.NbS_Score === 'number' ? props.NbS_Score : null;
  const polygonDisplayId = polygonKey !== null ? String(polygonKey) : '?';
  const siteRange = useMemo(() => {
    const scores = siteScores.filter((v) => Number.isFinite(v));
    if (scores.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...scores), max: Math.max(...scores) };
  }, [siteScores]);

  return (
    <>
      <PolygonFocusCard />
      {foodweb.available ? (
        <FoodWebDiagram guilds={foodweb.guilds} />
      ) : foodweb.loading ? (
        <p data-testid="foodweb-loading" style={{ color: 'var(--color-text-secondary)', fontSize: '12px', padding: '12px' }}>
          Loading food-web data…
        </p>
      ) : (
        <p data-testid="foodweb-unavailable" style={{ color: 'var(--color-text-secondary)', fontSize: '12px', padding: '12px' }}>
          Food-web data not yet available for this site.
        </p>
      )}
      <SecondaryAccordion
        title="NbS breakdown"
        peek="Restoration · Conservation · Total"
        defaultExpanded={true}
        storageKey="marine-acc-nbs"
      >
        {restoration !== null && conservation !== null && nbs !== null ? (
          <NbSScoreCard
            polygonId={polygonDisplayId}
            restorationPotential={restoration}
            conservationValue={conservation}
            nbsScore={nbs}
            siteRange={siteRange}
            siteScores={siteScores}
          />
        ) : (
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
            NbS data not available for this polygon.
          </p>
        )}
      </SecondaryAccordion>
      {/*
        BiomassChart + TimeSeriesPlayer accordions hidden until their real
        upstream datasets are wired (Track G/H/I follow-ups, 2026-05-12).
        Never show synthetic placeholder data — see feedback_no_placeholders.md.
      */}
    </>
  );
}

// ---------------------------------------------------------------------------
// MarineHeroPanel — orchestrator that swaps default/focused layout.
// ---------------------------------------------------------------------------

function MarineHeroPanelInner() {
  const selected = useAtomValue(selectedPolygonAtom);
  const aggregate = useMarineSiteAggregate();

  // Bridge selectedPolygonAtom → inspectedFeatureAtom for v1 component compat.
  useSelectedPolygonBridge();

  if (selected === null) {
    return (
      <div className={styles.panel} key="default" data-mode="default">
        <SiteAggregateCard {...aggregate} />
      </div>
    );
  }

  return (
    <div className={styles.panel} key="focused" data-mode="focused">
      <FocusedContent siteScores={aggregate.siteScores} />
    </div>
  );
}

export function MarineHeroPanel() {
  return (
    <MarineCrossSignalsProvider>
      <MarineHeroPanelInner />
    </MarineCrossSignalsProvider>
  );
}
