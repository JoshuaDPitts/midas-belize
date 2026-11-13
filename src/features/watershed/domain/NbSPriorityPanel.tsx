'use client';
import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { area as turfArea } from '@turf/turf';
import type { Feature, MultiPolygon, Polygon } from 'geojson';
import {
  activeSiteAtom,
  selectedPolygonAtom,
  swipeWatershedAtom,
  nbsRankWeightsAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import { useWatershedsForSite } from '@/lib/data';
import { useWatershedEbinCladePerPolygon } from '../map/useWatershedEbinCladePerPolygon';
import {
  computeRanking,
  getRegisteredFactors,
  type RankedPolygon,
  type WatershedPolygonContext,
} from './nbs-ranking';
// Side-effect import to register all 9 factors.
import './nbs-ranking/index';
import { NBS_PRESETS, getPresetById } from './nbs-ranking/presets';
import { nbsEncoder } from '../map/encoders';
import { indexJoinedRows, polygonKeyOf } from '../data/findWatershedFeature';
import { WatershedThumbnail } from './WatershedThumbnail';
import styles from './NbSPriorityPanel.module.css';

type WatershedFeature = Feature<Polygon | MultiPolygon>;

function rgbaToCss(rgba: [number, number, number, number]): string {
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${(rgba[3] / 255).toFixed(2)})`;
}

function p75(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)];
}

export function NbSPriorityPanel() {
  const site = useAtomValue(activeSiteAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setSwipe = useSetAtom(swipeWatershedAtom);
  const [weights, setWeights] = useAtom(nbsRankWeightsAtom);
  const [showSliders, setShowSliders] = useState(false);
  const [presetId, setPresetId] = useState<string>('');
  const rankButtonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const { geometry, joinedAttrs } = useWatershedsForSite(site);
  const { lookup: cladeLookup } = useWatershedEbinCladePerPolygon(site);

  // Build a merged WatershedPolygonContext[] by walking the geometry and
  // joining the NbS + RUSLE rows + clade aggregates. Mirrors what the map
  // layer + hero card do, but in a form the ranking engine wants.
  const polygons = useMemo<WatershedPolygonContext[]>(() => {
    if (!geometry) return [];
    const nbsByKey = indexJoinedRows(joinedAttrs?.nbs);
    const rusleByKey = indexJoinedRows(joinedAttrs?.rusle);
    return geometry.features
      .filter(
        (f): f is WatershedFeature =>
          f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon',
      )
      .map((feature) => {
        const props = (feature.properties ?? {}) as Record<string, unknown>;
        const key = polygonKeyOf(props);
        const stringKey = key !== null ? String(key).replace(/\.0+$/, '') : '';
        const merged: Record<string, unknown> = { ...props };
        const nbsRow = stringKey ? nbsByKey.get(stringKey) : undefined;
        if (nbsRow) Object.assign(merged, nbsRow);
        const rusleRow = stringKey ? rusleByKey.get(stringKey) : undefined;
        if (rusleRow) Object.assign(merged, rusleRow);
        // Clade aggregate from useWatershedEbinCladePerPolygon: convert
        // the 25-entry `clades` array to a 1-indexed `clade_fractions`
        // record so the clade-biodiversity factor's primary lookup hits.
        const cladeRow = stringKey ? cladeLookup.get(stringKey) : undefined;
        if (cladeRow) {
          merged.dominant_clade = cladeRow.dominantClade;
          const fractions: Record<number, number> = {};
          cladeRow.clades.forEach((v, i) => {
            if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
              fractions[i + 1] = v;
            }
          });
          if (Object.keys(fractions).length > 0) {
            merged.clade_fractions = fractions;
          }
        }
        return { feature, properties: merged };
      });
  }, [geometry, joinedAttrs, cladeLookup]);

  const factors = useMemo(() => getRegisteredFactors(), []);

  const ranked: RankedPolygon<WatershedPolygonContext>[] = useMemo(
    () => computeRanking(polygons, factors, weights),
    [polygons, factors, weights],
  );

  const summary = useMemo(() => {
    const restoredAreas: number[] = [];
    const conservationValues: number[] = [];
    const restorationValues: number[] = [];
    for (const r of ranked) {
      const props = r.polygon.properties;
      try {
        const areaKm2 = turfArea(r.polygon.feature) / 1_000_000;
        const restoration =
          typeof props.Restoration_Potential === 'number' ? props.Restoration_Potential : 0;
        const suitable =
          typeof props.Suitable_Elev_Pct === 'number' ? props.Suitable_Elev_Pct / 100 : 0;
        restoredAreas.push(areaKm2 * restoration * suitable);
      } catch {
        /* skip degenerate */
      }
      if (typeof props.Conservation_Value === 'number') {
        conservationValues.push(props.Conservation_Value);
      }
      if (typeof props.Restoration_Potential === 'number') {
        restorationValues.push(props.Restoration_Potential);
      }
    }
    const totalRestorable = restoredAreas.reduce((s, v) => s + v, 0);
    const meanConservation =
      conservationValues.length === 0
        ? 0
        : conservationValues.reduce((s, v) => s + v, 0) / conservationValues.length;
    // High-ROI = restoration-potential above the p75 of the visible set.
    const cutoff = p75(restorationValues);
    const highRoiCount = restorationValues.filter((v) => v >= cutoff && cutoff > 0).length;
    return { totalRestorable, meanConservation, highRoiCount };
  }, [ranked]);

  const applyPreset = (id: string) => {
    setPresetId(id);
    if (!id) return;
    const preset = getPresetById(id);
    if (preset) setWeights(preset.weights);
  };

  const handleRowClick = (r: RankedPolygon<WatershedPolygonContext>) => {
    const key = polygonKeyOf(r.polygon.properties);
    if (key === null) return;
    const ref: SelectedPolygonRef = { layerId: 'watershed-polygons', featureId: key };
    setSelected(ref);
  };

  const focusRank = (idx: number) => {
    rankButtonRefs.current[idx]?.focus();
  };

  const handleRankKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    idx: number,
    r: RankedPolygon<WatershedPolygonContext>,
  ) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      focusRank((idx + 1) % ranked.length);
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      focusRank((idx - 1 + ranked.length) % ranked.length);
      return;
    }
    if (e.key === 'Home') {
      e.preventDefault();
      focusRank(0);
      return;
    }
    if (e.key === 'End') {
      e.preventDefault();
      focusRank(ranked.length - 1);
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleRowClick(r);
    }
  };

  const handleCompareTopTwo = () => {
    if (ranked.length < 2) return;
    const top = polygonKeyOf(ranked[0].polygon.properties);
    const second = polygonKeyOf(ranked[1].polygon.properties);
    if (top === null || second === null) return;
    setSwipe({ left: top, right: second });
  };

  if (ranked.length === 0) {
    return (
      <section
        data-testid="watershed-tier-1-panel"
        className={styles.panel}
        aria-label="NbS priority ranking"
      >
        <div className={styles.empty}>No watersheds to rank for this site yet.</div>
      </section>
    );
  }

  return (
    <section
      data-testid="watershed-tier-1-panel"
      className={styles.panel}
      aria-label="NbS priority ranking"
    >
      <header className={styles.summaryRow}>
        <SummaryTile
          label="Restorable area"
          value={summary.totalRestorable.toFixed(1)}
          unit="km²"
        />
        <SummaryTile
          label="Mean conservation"
          value={summary.meanConservation.toFixed(2)}
          unit="0..1"
        />
        <SummaryTile
          label="High-ROI watersheds"
          value={String(summary.highRoiCount)}
          unit={`/ ${ranked.length}`}
        />
      </header>

      <div className={styles.controlsRow}>
        <label className={styles.presetLabel}>
          <span>Preset</span>
          <select
            data-testid="nbs-preset-select"
            value={presetId}
            onChange={(e) => applyPreset(e.target.value)}
            className={styles.presetSelect}
          >
            <option value="">Custom weights</option>
            {NBS_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={styles.customizeButton}
          aria-expanded={showSliders}
          aria-controls="nbs-sliders"
          onClick={() => setShowSliders((s) => !s)}
        >
          {showSliders ? 'Hide ranking factors' : 'Customise ranking'}
        </button>
      </div>

      {showSliders && (
        <div id="nbs-sliders" className={styles.sliders} role="group" aria-label="Factor weights">
          {factors.map((factor) => {
            const w = weights[factor.id] ?? factor.defaultWeight;
            return (
              <div key={factor.id} className={styles.sliderRow}>
                <span className={styles.sliderLabel}>{factor.label}</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.1}
                  value={w}
                  aria-label={`${factor.label} weight`}
                  data-testid={`nbs-slider-${factor.id}`}
                  onChange={(e) =>
                    setWeights({ ...weights, [factor.id]: Number(e.target.value) })
                  }
                  className={styles.slider}
                />
                <span className={styles.sliderValue}>{w.toFixed(1)}</span>
              </div>
            );
          })}
        </div>
      )}

      <ol className={styles.rankList} data-testid="nbs-rank-list">
        {ranked.map((r, i) => {
          const key = polygonKeyOf(r.polygon.properties);
          const isSelected =
            selected !== null &&
            selected.layerId === 'watershed-polygons' &&
            key !== null &&
            String(selected.featureId) === String(key);
          const props = r.polygon.properties;
          const name = String(polygonKeyOf(props) ?? '?');
          const restoration =
            typeof props.Restoration_Potential === 'number' ? props.Restoration_Potential : null;
          const conservation =
            typeof props.Conservation_Value === 'number' ? props.Conservation_Value : null;
          const encoderColor = rgbaToCss(nbsEncoder(props));
          return (
            <li
              key={String(key ?? i)}
              className={`${styles.rankRow} ${isSelected ? styles.rankRowSelected : ''}`}
              data-testid={`nbs-rank-row-${i + 1}`}
              data-rank={i + 1}
            >
              <button
                ref={(node) => {
                  rankButtonRefs.current[i] = node;
                }}
                type="button"
                className={styles.rankRowButton}
                onClick={() => handleRowClick(r)}
                onKeyDown={(e) => handleRankKeyDown(e, i, r)}
                aria-current={isSelected ? 'true' : undefined}
                aria-label={`Rank ${i + 1}: ${name}, score ${r.score.toFixed(2)}`}
              >
                <span className={`${styles.rankNumber} ${i < 3 ? styles.rankNumberTop : ''}`}>
                  {i + 1}
                </span>
                <WatershedThumbnail
                  feature={r.polygon.feature}
                  size={40}
                  encoderColor={encoderColor}
                  active={isSelected}
                  className={styles.thumb}
                />
                <span className={styles.rankBody}>
                  <span className={styles.rankName}>{name}</span>
                  <span className={styles.rankBars}>
                    {restoration !== null && (
                      <span
                        className={styles.bar}
                        role="meter"
                        aria-label={`Restoration potential ${(restoration * 100).toFixed(0)} percent`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(restoration * 100)}
                        title={`Restoration ${(restoration * 100).toFixed(0)}%`}
                        style={{
                          ['--bar-fill' as string]: `${Math.max(0, Math.min(1, restoration)) * 100}%`,
                          ['--bar-color' as string]: 'var(--color-accent-warm)',
                        }}
                      />
                    )}
                    {conservation !== null && (
                      <span
                        className={styles.bar}
                        role="meter"
                        aria-label={`Conservation value ${(conservation * 100).toFixed(0)} percent`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(conservation * 100)}
                        title={`Conservation ${(conservation * 100).toFixed(0)}%`}
                        style={{
                          ['--bar-fill' as string]: `${Math.max(0, Math.min(1, conservation)) * 100}%`,
                          ['--bar-color' as string]: 'var(--color-accent)',
                        }}
                      />
                    )}
                  </span>
                </span>
                <span className={styles.rankScore}>{r.score.toFixed(2)}</span>
              </button>
            </li>
          );
        })}
      </ol>

      {ranked.length >= 2 && (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.compareButton}
            data-testid="nbs-compare-top-two"
            onClick={handleCompareTopTwo}
          >
            Compare top 2 →
          </button>
        </footer>
      )}
    </section>
  );
}

function SummaryTile({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className={styles.summaryTile}>
      <span className={styles.summaryValue}>{value}</span>
      <span className={styles.summaryUnit}>{unit}</span>
      <span className={styles.summaryLabel}>{label}</span>
    </div>
  );
}
