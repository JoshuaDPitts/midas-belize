'use client';
import { useMemo } from 'react';
import { useSetAtom } from 'jotai';
import { timeStepAtom } from '@/atoms';
import styles from './ScenarioTimeSeries.module.css';

export interface SeriesPoint {
  month: number; // 0-indexed timeStep; corresponds to timeStepAtom values
  value: number;
}

export interface ScenarioTimeSeriesProps {
  base: SeriesPoint[];
  scenario: SeriesPoint[];
  /** Divergence is the first month where |scenario - base| / max(|base|, 1)
   * exceeds this fraction. Default 5%. */
  divergenceThreshold?: number;
}

const SVG_WIDTH = 420;
const SVG_HEIGHT = 160;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

/** Pure helper: locate the first month index where scenario diverges from
 * base by more than `threshold` (fraction of max(|base|, 1)). Returns -1
 * when the series never diverges or either input is empty. */
export function findDivergencePoint(
  base: SeriesPoint[],
  scenario: SeriesPoint[],
  threshold = 0.05,
): number {
  const len = Math.min(base.length, scenario.length);
  if (len === 0) return -1;
  for (let i = 0; i < len; i++) {
    if (base[i].month !== scenario[i].month) continue;
    const ref = Math.max(Math.abs(base[i].value), 1);
    if (Math.abs(scenario[i].value - base[i].value) / ref > threshold) return i;
  }
  return -1;
}

function buildPath(
  points: SeriesPoint[],
  yScale: (v: number) => number,
  xScale: (m: number) => number,
): string {
  if (points.length === 0) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.value)}`)
    .join(' ');
}

export function ScenarioTimeSeries({
  base,
  scenario,
  divergenceThreshold = 0.05,
}: ScenarioTimeSeriesProps) {
  const setTimeStep = useSetAtom(timeStepAtom);

  const { yScale, xScale, monthCount, yMin, yMax } = useMemo(() => {
    const all = [...base, ...scenario];
    const monthsArr = all.map((p) => p.month);
    const monthCountLocal = monthsArr.length === 0 ? 0 : Math.max(...monthsArr) + 1;
    const values = all.map((p) => p.value);
    const yMinLocal = values.length === 0 ? 0 : Math.min(...values, 0);
    const yMaxLocal = values.length === 0 ? 1 : Math.max(...values, 1);
    const innerW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
    const range = yMaxLocal - yMinLocal || 1;
    return {
      monthCount: monthCountLocal,
      yMin: yMinLocal,
      yMax: yMaxLocal,
      yScale: (v: number) => PAD_TOP + innerH - ((v - yMinLocal) / range) * innerH,
      xScale: (m: number) =>
        PAD_LEFT + (monthCountLocal <= 1 ? 0 : (m / (monthCountLocal - 1)) * innerW),
    };
  }, [base, scenario]);

  const divergenceIdx = useMemo(
    () => findDivergencePoint(base, scenario, divergenceThreshold),
    [base, scenario, divergenceThreshold],
  );

  if (base.length === 0 && scenario.length === 0) {
    return (
      <section data-testid="scenario-time-series" className={styles.empty}>
        Pick a scenario to see its projected trajectory vs the base case.
      </section>
    );
  }

  const basePath = buildPath(base, yScale, xScale);
  const scenarioPath = buildPath(scenario, yScale, xScale);

  // Area fill between the two paths. Only renders when both series are
  // non-empty AND share at least 2 month-aligned points.
  const aligned = useMemo<{ base: SeriesPoint[]; scenario: SeriesPoint[] }>(() => {
    const baseByMonth = new Map(base.map((p) => [p.month, p]));
    const a: SeriesPoint[] = [];
    const b: SeriesPoint[] = [];
    for (const s of scenario) {
      const bp = baseByMonth.get(s.month);
      if (bp) {
        a.push(bp);
        b.push(s);
      }
    }
    return { base: a, scenario: b };
  }, [base, scenario]);

  const areaPath = aligned.base.length > 1
    ? aligned.base
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(p.month)} ${yScale(p.value)}`)
        .join(' ') +
      ' L ' +
      aligned.scenario
        .slice()
        .reverse()
        .map((p) => `${xScale(p.month)} ${yScale(p.value)}`)
        .join(' L ') +
      ' Z'
    : '';

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0 || monthCount <= 1) return;
    const px = e.clientX - rect.left;
    // Convert px → viewBox x → month index.
    const viewBoxX = (px / rect.width) * SVG_WIDTH;
    const innerW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
    const t = Math.max(0, Math.min(1, (viewBoxX - PAD_LEFT) / innerW));
    const idx = Math.round(t * (monthCount - 1));
    setTimeStep(idx);
  };

  return (
    <section
      data-testid="scenario-time-series"
      className={styles.section}
      aria-label="Scenario projection vs base case"
    >
      <header className={styles.header}>
        <span className={styles.legendBase}>
          <span aria-hidden className={styles.legendSwatchBase} /> Base case
        </span>
        <span className={styles.legendScenario}>
          <span aria-hidden className={styles.legendSwatchScenario} /> Scenario
        </span>
      </header>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
        className={styles.svg}
        role="img"
        onClick={handleClick}
        data-testid="scenario-time-series-svg"
        aria-label={`Two-line projection chart, base vs scenario, ${monthCount} months. Click a point to set the timeline cursor.`}
      >
        {/* Y axis ticks (0, mid, max) */}
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
              x={PAD_LEFT - 4}
              y={yScale(v)}
              textAnchor="end"
              alignmentBaseline="central"
              className={styles.tickText}
            >
              {v.toFixed(0)}
            </text>
          </g>
        ))}

        {areaPath && (
          <path
            d={areaPath}
            className={styles.areaFill}
            data-testid="scenario-time-series-area"
          />
        )}

        {basePath && (
          <path
            d={basePath}
            className={styles.lineBase}
            data-testid="scenario-time-series-base-line"
          />
        )}
        {scenarioPath && (
          <path
            d={scenarioPath}
            className={styles.lineScenario}
            data-testid="scenario-time-series-scenario-line"
          />
        )}

        {divergenceIdx >= 0 && scenario[divergenceIdx] && (
          <g data-testid="scenario-time-series-divergence-marker">
            <line
              x1={xScale(scenario[divergenceIdx].month)}
              x2={xScale(scenario[divergenceIdx].month)}
              y1={PAD_TOP}
              y2={SVG_HEIGHT - PAD_BOTTOM}
              className={styles.divergenceLine}
            />
            <circle
              cx={xScale(scenario[divergenceIdx].month)}
              cy={yScale(scenario[divergenceIdx].value)}
              r={3.5}
              className={styles.divergenceDot}
            />
            <text
              x={xScale(scenario[divergenceIdx].month) + 4}
              y={PAD_TOP + 10}
              className={styles.divergenceLabel}
            >
              divergence
            </text>
          </g>
        )}
      </svg>
    </section>
  );
}
