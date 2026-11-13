'use client';
import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { coralClimateAtom, coralPlanAtom, coralYearAtom, coralSpeciesAtom, selectedPolygonAtom } from '@/atoms';
import { useCoralBiomass } from './useCoralBiomass';
import { nearestYear } from './coralPlayback';
import styles from './CoralBiomassChart.module.css';

const SVG_WIDTH = 420;
const SVG_HEIGHT = 200;
const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

// One fixed color per scenario (climate, plan) — reuses the app's
// categorical --color-viz-N tokens so this chart stays visually consistent
// with the rest of the design system's charts. Mapped in the CSS module.
const SCENARIO_CLASS: Record<string, string> = {
  '0|0': 'lineBaseNoRestore',
  '0|1': 'lineBaseRestore',
  '1|0': 'lineCcNoRestore',
  '1|1': 'lineCcRestore',
};

function scenarioKey(climate: 0 | 1, plan: 0 | 1): string {
  return `${climate}|${plan}`;
}

function buildPath(
  points: { year: number; total: number }[],
  xScale: (y: number) => number,
  yScale: (v: number) => number,
): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.year)} ${yScale(p.total)}`)
    .join(' ');
}

/** Modern SVG time series of total Laughing Bird coral biomass, one line
 * per (climate, restoration) scenario. The scenario matching the current
 * coralClimateAtom/coralPlanAtom selection is drawn thicker/opaque; the
 * other three fade. A vertical playhead marks coralYearAtom (or the
 * latest year when null). Clicking the chart seeks to the nearest year. */
export function CoralBiomassChart() {
  const { years, scenarios, speciesList, siteTotalSeries, polygonSeries, loading, error } = useCoralBiomass();
  const climate = useAtomValue(coralClimateAtom);
  const plan = useAtomValue(coralPlanAtom);
  const species = useAtomValue(coralSpeciesAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const [year, setYear] = useAtom(coralYearAtom);

  const effectiveYear = year ?? (years.length > 0 ? years[years.length - 1] : null);
  const activeKey = scenarioKey(climate, plan);
  const speciesLabel =
    species === 'all'
      ? 'All species'
      : speciesList.find((s) => s.id === species)?.name ?? `Species ${species}`;

  // When a reef polygon is selected, chart that polygon; otherwise sum the
  // whole reef. featureId is the mimes_id, which equals the biomass polygon_id.
  const selectedPolygonId =
    selected?.layerId === 'laughing-bird-marine-polygons' && Number.isFinite(Number(selected.featureId))
      ? Number(selected.featureId)
      : null;
  const scopeLabel = selectedPolygonId !== null ? `Polygon ${selectedPolygonId}` : 'All reef polygons';

  const seriesByScenario = useMemo(
    () =>
      scenarios.map((s) => ({
        scenario: s,
        points:
          selectedPolygonId !== null
            ? polygonSeries(selectedPolygonId, s.climate, s.plan, species)
            : siteTotalSeries(s.climate, s.plan, species),
      })),
    [scenarios, siteTotalSeries, polygonSeries, species, selectedPolygonId],
  );

  const { xScale, yScale, yMax, yMin } = useMemo(() => {
    const allTotals = seriesByScenario.flatMap((s) => s.points.map((p) => p.total));
    const yMinLocal = 0;
    const yMaxLocal = allTotals.length === 0 ? 1 : Math.max(...allTotals, 1);
    const innerW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const yearMin = years.length > 0 ? years[0] : 0;
    const yearMax = years.length > 0 ? years[years.length - 1] : 1;
    const yearSpan = yearMax - yearMin || 1;
    return {
      yMin: yMinLocal,
      yMax: yMaxLocal,
      xScale: (y: number) => PAD_LEFT + ((y - yearMin) / yearSpan) * innerW,
      yScale: (v: number) => PAD_TOP + innerH - ((v - yMinLocal) / (yMaxLocal - yMinLocal || 1)) * innerH,
    };
  }, [seriesByScenario, years]);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (years.length === 0) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const px = e.clientX - rect.left;
    const viewBoxX = (px / rect.width) * SVG_WIDTH;
    const innerW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const yearMin = years[0];
    const yearMax = years[years.length - 1];
    const t = Math.max(0, Math.min(1, (viewBoxX - PAD_LEFT) / innerW));
    const targetYear = yearMin + t * (yearMax - yearMin);
    const snapped = nearestYear(years, targetYear);
    if (snapped !== null) setYear(snapped);
  }

  if (loading) {
    return (
      <section className={styles.empty} data-testid="coral-biomass-chart" aria-busy="true">
        Loading coral biomass…
      </section>
    );
  }

  if (error || years.length === 0) {
    return (
      <section className={styles.empty} data-testid="coral-biomass-chart">
        No coral biomass data available.
      </section>
    );
  }

  const playheadX = effectiveYear !== null ? xScale(effectiveYear) : null;

  return (
    <section
      className={styles.section}
      data-testid="coral-biomass-chart"
      aria-label="Coral biomass over time by scenario"
    >
      <div className={styles.caption} data-testid="coral-chart-species-caption">
        <span className={styles.captionLabel}>{scopeLabel}</span>
        <span className={styles.captionSpecies}>{speciesLabel}</span>
      </div>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className={styles.svg}
        role="img"
        onClick={handleClick}
        data-testid="coral-biomass-chart-svg"
        aria-label={`Coral biomass time series — ${scopeLabel}, ${speciesLabel}, ${years.length} years, 4 scenarios. Click to set the year.`}
      >
        {/* Y gridlines + axis labels (0, mid, max) */}
        {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={SVG_WIDTH - PAD_RIGHT}
              y1={yScale(v)}
              y2={yScale(v)}
              className={styles.gridLine}
            />
            <text
              x={PAD_LEFT - 6}
              y={yScale(v)}
              textAnchor="end"
              alignmentBaseline="central"
              className={styles.tickText}
            >
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toFixed(0)}
            </text>
          </g>
        ))}

        {/* X axis year labels */}
        {years.map((y) => (
          <text
            key={y}
            x={xScale(y)}
            y={SVG_HEIGHT - 6}
            textAnchor="middle"
            className={styles.tickText}
          >
            {y}
          </text>
        ))}

        {/* Scenario lines */}
        {seriesByScenario.map(({ scenario, points }) => {
          const key = scenarioKey(scenario.climate, scenario.plan);
          const active = key === activeKey;
          const cls = SCENARIO_CLASS[key];
          return (
            <path
              key={scenario.runId}
              d={buildPath(points, xScale, yScale)}
              className={`${styles.line} ${styles[cls]} ${active ? styles.lineActive : styles.lineFaded}`}
              data-testid={`coral-chart-line-${scenario.runId}`}
            />
          );
        })}

        {/* Playhead */}
        {playheadX !== null && (
          <line
            x1={playheadX}
            x2={playheadX}
            y1={PAD_TOP}
            y2={SVG_HEIGHT - PAD_BOTTOM}
            className={styles.playhead}
            data-testid="coral-chart-playhead"
          />
        )}
      </svg>

      <ul className={styles.legend}>
        {scenarios.map((s) => {
          const key = scenarioKey(s.climate, s.plan);
          const active = key === activeKey;
          const cls = SCENARIO_CLASS[key];
          return (
            <li key={s.runId} className={`${styles.legendItem} ${active ? styles.legendItemActive : ''}`}>
              <span aria-hidden className={`${styles.legendSwatch} ${styles[cls]}`} />
              {s.label}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
