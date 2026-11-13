'use client';
import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { activeSiteAtom, effectiveMarineEncodingAtom, coralSpeciesAtom, type MarineEncodingMode } from '@/atoms';
import { useCoralBiomass } from '@/features/marine/domain/useCoralBiomass';
import { CLADES, groupCladesByFamily } from '@/lib/map/core/clades';
import { CladeLegendList } from '@/lib/map/legends/CladeLegendList';
import { buildLayerConfigsForSite } from './buildLayerConfigsForSite';
import type { MarineSiteId } from './MarineMapLayers.types';
import { useEbinCladePerPolygon, type MarineSite } from './useEbinCladePerPolygon';
import { usePolygonGeoJson, type MarinePolygonFeature } from './usePolygonGeoJson';
import styles from './MapLegend.module.css';

const ALL_CLADE_IDS = CLADES.map((c) => c.id);

interface MapLegendProps {
  /** Optional override; production reads live values from active polygons. */
  featureValues?: number[];
}

const MODE_TITLE: Record<MarineEncodingMode, string> = {
  nbs: 'NbS Score',
  clade: 'Dominant clade',
  restoration: 'Restoration Potential',
  biomass: 'Coral biomass',
};

function histogramBinCount(valueCount: number): number {
  if (valueCount <= 0) return 0;
  return Math.min(8, Math.max(4, Math.ceil(Math.sqrt(valueCount))));
}

function bin(values: number[], min: number, max: number, n: number): number[] {
  if (values.length === 0 || max <= min) return Array(n).fill(0);
  const span = max - min;
  const counts = Array(n).fill(0);
  for (const v of values) {
    const t = Math.min(0.9999999, Math.max(0, (v - min) / span));
    counts[Math.floor(t * n)]++;
  }
  return counts;
}

function binColor(encoding: MarineEncodingMode, idx: number, count: number): string {
  const t = count <= 1 ? 0 : idx / (count - 1);
  if (encoding === 'nbs') {
    return `color-mix(in oklab, rgb(232, 116, 95) ${Math.round(t * 100)}%, rgb(155, 175, 175))`;
  }
  return `color-mix(in oklab, rgb(240, 192, 64) ${Math.round(t * 100)}%, rgb(180, 180, 180))`;
}

export function MapLegend({ featureValues: featureValuesProp }: MapLegendProps = {}) {
  // effectiveMarineEncodingAtom reconciles the persisted global
  // marineEncodingAtom with the Laughing Bird special case (biomass-only
  // site) so the legend and the map fill (MarineMapLayers) never diverge
  // on the active encoding. See src/atoms/index.ts.
  const encoding = useAtomValue(effectiveMarineEncodingAtom);
  const activeSite = useAtomValue(activeSiteAtom);
  const coralSpecies = useAtomValue(coralSpeciesAtom);

  // Live data path: read from the active site's polygon datasets.
  // Hooks must run unconditionally — use 3 fixed slots since configs.length is bounded.
  const liveConfigs = featureValuesProp === undefined
    ? buildLayerConfigsForSite(activeSite as MarineSiteId | null)
    : [];
  const geo0 = usePolygonGeoJson(liveConfigs[0]?.datasetId ?? null);
  const geo1 = usePolygonGeoJson(liveConfigs[1]?.datasetId ?? null);
  const geo2 = usePolygonGeoJson(liveConfigs[2]?.datasetId ?? null);

  // Dominant clade per polygon, fetched only in clade mode (null short-circuits).
  const cladeSite = encoding === 'clade' ? (activeSite as MarineSite | null) : null;
  const { byFamily } = useEbinCladePerPolygon(cladeSite);

  // Coral biomass scenario domain (LBD scenario viz). maxBiomass is the
  // fixed global max MarineMapLayers uses for biomassToRgba, so the legend's
  // gradient endpoint always matches the choropleth exactly.
  const { maxBiomassFor, speciesList } = useCoralBiomass();
  const biomassMax = maxBiomassFor(coralSpecies);
  const biomassTitle =
    coralSpecies === 'all'
      ? 'Coral biomass · all species'
      : `Coral biomass · ${speciesList.find((s) => s.id === coralSpecies)?.name ?? `species ${coralSpecies}`}`;

  const liveValues: number[] = [geo0, geo1, geo2]
    .filter((r) => r.data)
    .flatMap((r) => r.data!.features as MarinePolygonFeature[])
    .map((f) => {
      if (encoding === 'nbs') return f.properties?.NbS_Score;
      if (encoding === 'restoration') return f.properties?.Restoration_Potential;
      return undefined;
    })
    .filter((v): v is number => typeof v === 'number');

  const featureValues = featureValuesProp ?? liveValues;

  const range = useMemo(() => {
    if (featureValues.length === 0) return { min: 0, max: 1 };
    return { min: Math.min(...featureValues), max: Math.max(...featureValues) };
  }, [featureValues]);
  const binCount = histogramBinCount(featureValues.length);
  const bins = useMemo(() => bin(featureValues, range.min, range.max, binCount), [featureValues, range, binCount]);
  const maxBin = Math.max(...bins, 1);

  if (encoding === 'clade') {
    const present: number[] = [];
    for (const familyMap of Object.values(byFamily)) {
      for (const row of familyMap.values()) {
        if (row.dominantClade !== null) present.push(row.dominantClade);
      }
    }
    const groups = groupCladesByFamily(present.length > 0 ? present : ALL_CLADE_IDS);
    return (
      <aside className={styles.legend} aria-label="Map color legend">
        <header className={styles.title}>{MODE_TITLE[encoding]}</header>
        <CladeLegendList groups={groups} />
      </aside>
    );
  }

  if (encoding === 'biomass') {
    return (
      <aside className={styles.legend} aria-label="Map color legend">
        <header className={styles.title}>{biomassTitle}</header>
        <div
          className={styles.gradientBar}
          data-testid="legend-gradient-bar"
          style={{ background: 'linear-gradient(to right, rgb(225, 240, 230), rgb(16, 130, 96))' }}
        />
        <div className={styles.tickRow}>
          <span data-testid="legend-min">0.00</span>
          <span>{(biomassMax / 2).toFixed(2)}</span>
          <span data-testid="legend-max">{biomassMax.toFixed(2)}</span>
        </div>
      </aside>
    );
  }

  const gradient =
    encoding === 'nbs'
      ? 'linear-gradient(to right, rgb(155, 175, 175), rgb(232, 116, 95))'
      : 'linear-gradient(to right, rgb(180, 180, 180), rgb(240, 192, 64))';

  return (
    <aside className={styles.legend} aria-label="Map color legend">
      <header className={styles.title}>{MODE_TITLE[encoding]}</header>
      <div className={styles.gradientBar} data-testid="legend-gradient-bar" style={{ background: gradient }} />
      <div className={styles.tickRow}>
        <span data-testid="legend-min">{range.min.toFixed(2)}</span>
        <span>{((range.min + range.max) / 2).toFixed(2)}</span>
        <span data-testid="legend-max">{range.max.toFixed(2)}</span>
      </div>
      {featureValues.length > 0 && (
        <>
          <div className={styles.histogramLabel}>Polygons by score · n={featureValues.length}</div>
          <div
            className={styles.histogram}
            role="img"
            aria-label={`Distribution of ${featureValues.length} polygons across ${binCount} ${MODE_TITLE[encoding]} score bins`}
            style={{ gridTemplateColumns: `repeat(${binCount}, 1fr)` }}
          >
            {bins.map((count, i) => (
              <div
                key={i}
                data-testid={`legend-histogram-bin-${i}`}
                className={styles.histogramBar}
                style={{
                  height: `${(count / maxBin) * 100}%`,
                  minHeight: count > 0 ? 2 : 0,
                  background: binColor(encoding, i, binCount),
                }}
                title={`${count} polygon${count === 1 ? '' : 's'}`}
              />
            ))}
          </div>
        </>
      )}
    </aside>
  );
}
