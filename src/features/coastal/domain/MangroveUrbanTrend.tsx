'use client';
import { useAtomValue } from 'jotai';
import { selectedPolygonAtom, coastalResolutionAtom } from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { useCoastalForSite } from '@/lib/data/hooks/useCoastalForSite';
import styles from './MangroveUrbanTrend.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LandcoverRow {
  Polygon_ID?: string | number;
  year?: number | string;
  Mangrove_Area?: number;
  Urban_Area?: number;
  [key: string]: unknown;
}

interface TimeSeriesPoint {
  year: number;
  mangrove: number;
  urban: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractLandcoverRows(landcover: unknown[]): LandcoverRow[] {
  return landcover as LandcoverRow[];
}

/**
 * Aggregate rows by year — sums Mangrove_Area and Urban_Area across all polygons
 * (or just the ones matching `polygonId` if provided).
 */
function aggregateTimeSeries(
  rows: LandcoverRow[],
  polygonId: string | null,
): TimeSeriesPoint[] {
  const byYear = new Map<number, { mangrove: number; urban: number }>();

  for (const row of rows) {
    // Filter by polygon if a selection is active
    if (polygonId !== null) {
      const rowId =
        row['Polygon_ID'] !== undefined && row['Polygon_ID'] !== null
          ? String(row['Polygon_ID'])
          : null;
      if (rowId !== polygonId) continue;
    }

    const year =
      typeof row['year'] === 'number'
        ? row['year']
        : typeof row['year'] === 'string'
          ? parseInt(row['year'], 10)
          : NaN;
    if (!Number.isFinite(year)) continue;

    const mangrove =
      typeof row['Mangrove_Area'] === 'number' ? row['Mangrove_Area'] : 0;
    const urban = typeof row['Urban_Area'] === 'number' ? row['Urban_Area'] : 0;

    const existing = byYear.get(year);
    if (existing) {
      existing.mangrove += mangrove;
      existing.urban += urban;
    } else {
      byYear.set(year, { mangrove, urban });
    }
  }

  return Array.from(byYear.entries())
    .map(([year, vals]) => ({ year, ...vals }))
    .sort((a, b) => a.year - b.year);
}

// ---------------------------------------------------------------------------
// SVG chart rendering helpers
// ---------------------------------------------------------------------------

const CHART_WIDTH = 320;
const CHART_HEIGHT = 140;
const PADDING = { top: 12, right: 12, bottom: 28, left: 40 };

function scaleX(year: number, minYear: number, maxYear: number): number {
  if (maxYear === minYear) return PADDING.left;
  return (
    PADDING.left +
    ((year - minYear) / (maxYear - minYear)) *
      (CHART_WIDTH - PADDING.left - PADDING.right)
  );
}

function scaleY(
  value: number,
  minVal: number,
  maxVal: number,
  isLeft: boolean,
): number {
  const h = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  if (maxVal === minVal) return isLeft ? PADDING.top + h / 2 : PADDING.top + h / 2;
  return (
    PADDING.top + h - ((value - minVal) / (maxVal - minVal)) * h
  );
}

function buildPoints(
  series: TimeSeriesPoint[],
  field: 'mangrove' | 'urban',
  minYear: number,
  maxYear: number,
  minVal: number,
  maxVal: number,
  isLeft: boolean,
): string {
  return series
    .map((pt) => {
      const x = scaleX(pt.year, minYear, maxYear);
      const y = scaleY(pt[field], minVal, maxVal, isLeft);
      return `${x},${y}`;
    })
    .join(' ');
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface MangroveUrbanTrendProps {
  site: SiteId | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MangroveUrbanTrend({ site }: MangroveUrbanTrendProps) {
  const resolution = useAtomValue(coastalResolutionAtom);
  const selected = useAtomValue(selectedPolygonAtom);

  const { joinedAttrs, loading } = useCoastalForSite(site, resolution);

  // Derive selected polygon id
  const selectedPolygonId =
    selected !== null ? String(selected.featureId) : null;

  // Extract and aggregate landcover rows
  const landcoverRows = joinedAttrs
    ? extractLandcoverRows(joinedAttrs.landcover)
    : [];

  const series = loading ? [] : aggregateTimeSeries(landcoverRows, selectedPolygonId);

  // Empty state (also during loading since we have no data yet)
  if (loading || (!loading && series.length === 0)) {
    return (
      <div className={styles.panel} data-testid="mangrove-trend-panel">
        <header className={styles.header}>
          <span className={styles.headerTitle}>Mangrove &amp; Urban Trend</span>
          <span className={styles.scopeLabel}>
            {selectedPolygonId ? selectedPolygonId : 'All polygons'}
          </span>
        </header>
        <div className={styles.empty} data-testid="mangrove-trend-empty">
          No time-series data available.
        </div>
      </div>
    );
  }

  // Compute scale extents
  const years = series.map((pt) => pt.year);
  const minYear = years.length > 0 ? Math.min(...years) : 0;
  const maxYear = years.length > 0 ? Math.max(...years) : 0;

  const mangroveVals = series.map((pt) => pt.mangrove);
  const urbanVals = series.map((pt) => pt.urban);

  const mangroveMin = mangroveVals.length > 0 ? Math.min(...mangroveVals) : 0;
  const mangroveMax = mangroveVals.length > 0 ? Math.max(...mangroveVals) : 1;
  const urbanMin = urbanVals.length > 0 ? Math.min(...urbanVals) : 0;
  const urbanMax = urbanVals.length > 0 ? Math.max(...urbanVals) : 1;

  const mangrovePts = buildPoints(
    series,
    'mangrove',
    minYear,
    maxYear,
    mangroveMin,
    mangroveMax,
    true,
  );

  const urbanPts = buildPoints(
    series,
    'urban',
    minYear,
    maxYear,
    urbanMin,
    urbanMax,
    false,
  );

  // X-axis year labels (first, last, middle if space)
  const axisYears =
    series.length > 2
      ? [series[0].year, series[Math.floor(series.length / 2)].year, series[series.length - 1].year]
      : series.map((pt) => pt.year);
  const uniqueAxisYears = [...new Set(axisYears)];

  return (
    <div className={styles.panel} data-testid="mangrove-trend-panel">
      <header className={styles.header}>
        <span className={styles.headerTitle}>Mangrove &amp; Urban Trend</span>
        <span className={styles.scopeLabel}>
          {selectedPolygonId ? selectedPolygonId : 'All polygons'}
        </span>
      </header>

      {/* Legend */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: 'var(--color-accent-green, #22c55e)' }} />
          Mangrove
        </span>
        <span className={styles.legendItem}>
          <span className={styles.legendSwatch} style={{ background: 'var(--color-accent-warm, #f59e0b)' }} />
          Urban
        </span>
      </div>

      {/* SVG chart */}
      <svg
        className={styles.chart}
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        aria-label="Mangrove and urban area trend chart"
        role="img"
      >
        {/* Grid lines */}
        <line
          x1={PADDING.left}
          y1={PADDING.top}
          x2={PADDING.left}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="var(--color-border, #e2e8f0)"
          strokeWidth={1}
        />
        <line
          x1={PADDING.left}
          y1={CHART_HEIGHT - PADDING.bottom}
          x2={CHART_WIDTH - PADDING.right}
          y2={CHART_HEIGHT - PADDING.bottom}
          stroke="var(--color-border, #e2e8f0)"
          strokeWidth={1}
        />

        {/* Mangrove line (green) */}
        {series.length > 1 && (
          <polyline
            data-series="mangrove"
            points={mangrovePts}
            fill="none"
            stroke="var(--color-accent-green, #22c55e)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Urban line (amber) */}
        {series.length > 1 && (
          <polyline
            data-series="urban"
            points={urbanPts}
            fill="none"
            stroke="var(--color-accent-warm, #f59e0b)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray="4 2"
          />
        )}

        {/* X-axis year labels */}
        {uniqueAxisYears.map((year) => (
          <text
            key={year}
            x={scaleX(year, minYear, maxYear)}
            y={CHART_HEIGHT - PADDING.bottom + 14}
            textAnchor="middle"
            fontSize={10}
            fill="var(--color-text-tertiary, #94a3b8)"
          >
            {year}
          </text>
        ))}
      </svg>
    </div>
  );
}
