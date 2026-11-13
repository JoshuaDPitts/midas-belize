'use client';
import { useMemo, useState } from 'react';
import { useErosionAttribution } from '@/lib/data/hooks/useErosionAttribution';
import styles from './ErosionAttributionChart.module.css';

export type { ElevBinRow } from '@/lib/data/hooks/useErosionAttribution';
import type { ElevBinRow } from '@/lib/data/hooks/useErosionAttribution';

const PAD_LEFT = 44;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 36;
const WIDTH = 320;
const HEIGHT = 200;

function normaliseId(v: string | number): string {
  return String(v).replace(/\.0+$/, '');
}

export function binsForPolygon(
  rows: ElevBinRow[],
  polygonId: string | number,
): ElevBinRow[] {
  const target = normaliseId(polygonId);
  return rows.filter((r) => normaliseId(r.Polygon_ID) === target);
}

export function aggregateBins(rows: ElevBinRow[]): ElevBinRow[] {
  const byBin = new Map<number, { binId: number; label: string; total: number }>();
  for (const r of rows) {
    if (typeof r.BIN_ID !== 'number') continue;
    const prev = byBin.get(r.BIN_ID);
    const erosion = typeof r.erosion_kg_yr === 'number' ? r.erosion_kg_yr : 0;
    if (prev) {
      prev.total += erosion;
    } else {
      byBin.set(r.BIN_ID, { binId: r.BIN_ID, label: r.BIN_Label, total: erosion });
    }
  }
  return [...byBin.values()]
    .sort((a, b) => a.binId - b.binId)
    .map((b) => ({
      Polygon_ID: '__aggregate__',
      BIN_ID: b.binId,
      BIN_Label: b.label,
      erosion_kg_yr: b.total,
    }));
}

function tickFormat(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return v.toFixed(0);
}

export interface ErosionAttributionChartProps {
  polygonId: string | number | null;
}

export function ErosionAttributionChart({ polygonId }: ErosionAttributionChartProps) {
  const { rows, loading } = useErosionAttribution(polygonId);
  const [hover, setHover] = useState<number | null>(null);

  const bars = useMemo(() => {
    if (polygonId !== null) return binsForPolygon(rows, polygonId);
    return aggregateBins(rows);
  }, [rows, polygonId]);

  if (loading) {
    return (
      <div
        className={styles.placeholder}
        data-testid="erosion-attribution-loading"
        aria-busy="true"
      >
        Loading erosion attribution…
      </div>
    );
  }

  if (bars.length === 0) {
    return (
      <div className={styles.placeholder} data-testid="erosion-attribution-empty">
        No elevation-bin data joined for this watershed yet.
      </div>
    );
  }

  const max = Math.max(
    1,
    ...bars.map((b) => (typeof b.erosion_kg_yr === 'number' ? b.erosion_kg_yr : 0)),
  );
  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const barW = innerW / bars.length;
  const tickCount = 4;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => (max / tickCount) * i);

  return (
    <figure className={styles.figure} data-testid="erosion-attribution-chart">
      <figcaption className={styles.caption}>
        {polygonId === null
          ? 'Erosion contribution by elevation band (site aggregate)'
          : `Erosion contribution by elevation band · ${polygonId}`}
        <span className={styles.unit}>kg/yr</span>
      </figcaption>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={styles.svg}
        role="img"
        aria-label="Erosion attribution per elevation bin"
      >
        {ticks.map((t, i) => {
          const y = PAD_TOP + innerH - (t / max) * innerH;
          return (
            <g key={i}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={y}
                y2={y}
                className={styles.tickLine}
              />
              <text x={PAD_LEFT - 6} y={y} className={styles.tickText}>
                {tickFormat(t)}
              </text>
            </g>
          );
        })}
        {bars.map((b, i) => {
          const v = typeof b.erosion_kg_yr === 'number' ? b.erosion_kg_yr : 0;
          const h = (v / max) * innerH;
          const x = PAD_LEFT + i * barW + barW * 0.12;
          const y = PAD_TOP + innerH - h;
          const w = barW * 0.76;
          const isHover = hover === b.BIN_ID;
          return (
            <g
              key={b.BIN_ID}
              data-testid={`erosion-bar-${b.BIN_ID}`}
              onMouseEnter={() => setHover(b.BIN_ID)}
              onMouseLeave={() => setHover(null)}
            >
              <rect
                x={x}
                y={y}
                width={w}
                height={h}
                rx={2}
                className={isHover ? styles.barHover : styles.bar}
              />
              <text
                x={x + w / 2}
                y={PAD_TOP + innerH + 14}
                className={styles.binLabel}
                textAnchor="middle"
              >
                {b.BIN_Label ?? b.BIN_ID}
              </text>
              {isHover && (
                <text
                  x={x + w / 2}
                  y={Math.max(y - 4, PAD_TOP + 10)}
                  className={styles.tooltip}
                  textAnchor="middle"
                >
                  {tickFormat(v)} kg/yr
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
