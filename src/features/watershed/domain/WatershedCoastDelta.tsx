'use client';
import { useMemo } from 'react';
import { useSetAtom } from 'jotai';
import {
  selectedPolygonAtom,
  hoveredPolygonAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import styles from './WatershedCoastDelta.module.css';

export interface WatershedCoastDeltaProps {
  watershedDeltas: Map<string, number>;
  coastDeltas: Map<string, number>;
}

interface RowDatum {
  id: string;
  delta: number;
}

function toSortedRows(deltas: Map<string, number>): RowDatum[] {
  const rows: RowDatum[] = [];
  for (const [id, delta] of deltas) {
    rows.push({ id, delta });
  }
  // Sort by absolute magnitude descending so the largest impacts read first.
  rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return rows;
}

const SVG_WIDTH = 420;
const ROW_HEIGHT = 22;
const PADDING_TOP = 28;
const COLUMN_WIDTH = 130;
const GUTTER_WIDTH = SVG_WIDTH - COLUMN_WIDTH * 2;
const LEFT_COL_X = 0;
const RIGHT_COL_X = SVG_WIDTH - COLUMN_WIDTH;

function colorForDelta(delta: number): string {
  if (delta < 0) return 'var(--color-status-success, oklch(60% 0.15 145))';
  if (delta > 0) return 'var(--color-accent-warm, oklch(72% 0.17 30))';
  return 'var(--color-text-tertiary)';
}

export function WatershedCoastDelta({
  watershedDeltas,
  coastDeltas,
}: WatershedCoastDeltaProps) {
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);

  const wsRows = useMemo(() => toSortedRows(watershedDeltas), [watershedDeltas]);
  const coRows = useMemo(() => toSortedRows(coastDeltas), [coastDeltas]);
  const rowsCount = Math.max(wsRows.length, coRows.length);

  const maxAbs = useMemo(() => {
    let m = 0;
    for (const r of [...wsRows, ...coRows]) {
      const a = Math.abs(r.delta);
      if (a > m) m = a;
    }
    return m;
  }, [wsRows, coRows]);

  if (rowsCount === 0) {
    return (
      <section
        data-testid="watershed-coast-delta"
        className={styles.empty}
        aria-label="Scenario impact deltas"
      >
        Pick a scenario to see watershed → coast deltas. No deltas available for the current selection yet.
      </section>
    );
  }

  const svgHeight = PADDING_TOP + rowsCount * ROW_HEIGHT + 8;

  const handleEnter = (id: string) => {
    setHovered({ layerId: 'watershed-polygons', featureId: id } as SelectedPolygonRef);
  };
  const handleLeave = () => {
    setHovered(null);
  };
  const handleSelect = (id: string) => {
    setSelected({ layerId: 'watershed-polygons', featureId: id } as SelectedPolygonRef);
  };

  return (
    <section
      data-testid="watershed-coast-delta"
      className={styles.section}
      aria-label="Scenario impact deltas"
    >
      <header className={styles.header}>
        <span className={styles.colLabel}>Watershed Δerosion</span>
        <span className={styles.colLabel}>Coastal partner Δ</span>
      </header>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
        className={styles.svg}
        role="img"
        aria-label="Twin-bar chart of watershed vs coast deltas"
      >
        {/* connector arcs first so bars overlay them at the edges */}
        {wsRows.map((wsr, i) => {
          const cor = coRows[i];
          if (!cor) return null;
          const y1 = PADDING_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const x1 = LEFT_COL_X + COLUMN_WIDTH;
          const x2 = RIGHT_COL_X;
          const cx = x1 + GUTTER_WIDTH / 2;
          const d = `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y1}, ${x2} ${y1}`;
          return (
            <path
              key={`arc-${wsr.id}-${cor.id}`}
              d={d}
              className={styles.arc}
              fill="none"
              stroke={colorForDelta(wsr.delta)}
              data-testid={`watershed-coast-delta-arc-${i + 1}`}
            />
          );
        })}

        {/* watershed (left) bars */}
        {wsRows.map((r, i) => {
          const w = maxAbs > 0 ? (Math.abs(r.delta) / maxAbs) * COLUMN_WIDTH : 0;
          const y = PADDING_TOP + i * ROW_HEIGHT;
          return (
            <g
              key={`ws-${r.id}`}
              data-testid={`watershed-coast-delta-watershed-${r.id}`}
              onMouseEnter={() => handleEnter(r.id)}
              onMouseLeave={handleLeave}
              onClick={() => handleSelect(r.id)}
              className={styles.rowGroup}
            >
              <rect
                x={LEFT_COL_X + (COLUMN_WIDTH - w)}
                y={y + 4}
                width={w}
                height={ROW_HEIGHT - 8}
                rx={2}
                fill={colorForDelta(r.delta)}
              />
              <text
                x={LEFT_COL_X + COLUMN_WIDTH - 4}
                y={y + ROW_HEIGHT - 6}
                textAnchor="end"
                className={styles.rowLabel}
              >
                {r.id}
              </text>
            </g>
          );
        })}

        {/* coast (right) bars */}
        {coRows.map((r, i) => {
          const w = maxAbs > 0 ? (Math.abs(r.delta) / maxAbs) * COLUMN_WIDTH : 0;
          const y = PADDING_TOP + i * ROW_HEIGHT;
          return (
            <g
              key={`co-${r.id}`}
              data-testid={`watershed-coast-delta-coast-${r.id}`}
              onMouseEnter={() => handleEnter(r.id)}
              onMouseLeave={handleLeave}
              onClick={() => handleSelect(r.id)}
              className={styles.rowGroup}
            >
              <rect
                x={RIGHT_COL_X}
                y={y + 4}
                width={w}
                height={ROW_HEIGHT - 8}
                rx={2}
                fill={colorForDelta(r.delta)}
              />
              <text
                x={RIGHT_COL_X + 4}
                y={y + ROW_HEIGHT - 6}
                textAnchor="start"
                className={styles.rowLabel}
              >
                {r.id}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
