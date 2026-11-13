'use client';
import { useMemo, useState } from 'react';
import { useSetAtom } from 'jotai';
import {
  selectedPolygonAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import type { MassBalanceFates, MassBalanceSource } from '@/lib/data/hooks/useMassBalance';
import styles from './SedimentFlowSankey.module.css';

export interface SedimentFlowSankeyProps {
  sources: MassBalanceSource[];
  transport: { drainage_t_per_yr: number };
  fates: MassBalanceFates;
  total: number;
  /** Optional callback fired when a fate node is clicked. Used by the
   * three-hop bridge (WS-044) to hand off to Marine@LBC. */
  onFateClick?: (fate: keyof MassBalanceFates) => void;
}

const SVG_WIDTH = 480;
const ROW_HEIGHT = 22;
const PAD_TOP = 28;
const PAD_BOTTOM = 8;
const COL_X = {
  sources: 0,
  drainage: 160,
  fates: 380,
} as const;
const COL_WIDTH = 90;
const DRAINAGE_WIDTH = 110;
const FATE_LABELS = {
  coastal: 'Coastal deposition',
  nearshore: 'Nearshore export',
  offshore: 'Offshore export',
} as const;

function formatTonnes(v: number): string {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k t/yr`;
  if (v >= 1) return `${v.toFixed(1)} t/yr`;
  return `${(v * 1000).toFixed(0)} kg/yr`;
}

export function SedimentFlowSankey({
  sources,
  transport,
  fates,
  total,
  onFateClick,
}: SedimentFlowSankeyProps) {
  const setSelected = useSetAtom(selectedPolygonAtom);
  const [hovered, setHovered] = useState<{ kind: 'source' | 'fate'; id: string } | null>(null);

  const sourcesCount = sources.length;
  const fatesCount = 3;
  const rowsCount = Math.max(sourcesCount, fatesCount);
  const svgHeight = PAD_TOP + rowsCount * ROW_HEIGHT + PAD_BOTTOM;

  const maxSource = useMemo(
    () => sources.reduce((m, s) => Math.max(m, s.tPerYr), 0),
    [sources],
  );

  if (total <= 0 || sources.length === 0) {
    return (
      <section
        data-testid="sediment-flow-sankey"
        className={styles.empty}
        aria-label="Sediment flow Sankey"
      >
        No sediment-yield data joined yet. Once RUSLE A values reach the
        watershed polygons, this Sankey diagram populates source, transport,
        and fate flows.
      </section>
    );
  }

  const totalFates = fates.coastal + fates.nearshore + fates.offshore || 1;

  const drainageY = PAD_TOP + (rowsCount * ROW_HEIGHT) / 2;

  return (
    <section
      data-testid="sediment-flow-sankey"
      className={styles.section}
      aria-label="Sediment flow Sankey"
    >
      <header className={styles.header}>
        <span className={styles.colLabel}>Sources</span>
        <span className={styles.colLabel}>Drainage</span>
        <span className={styles.colLabel}>Fates</span>
      </header>
      <svg
        viewBox={`0 0 ${SVG_WIDTH} ${svgHeight}`}
        className={styles.svg}
        role="img"
        aria-label="3-column Sankey of sediment yield, transport, and fates"
      >
        {/* Source → Drainage flows */}
        {sources.map((s, i) => {
          const sy = PAD_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const x1 = COL_X.sources + COL_WIDTH;
          const x2 = COL_X.drainage;
          const cx = (x1 + x2) / 2;
          const width = maxSource > 0 ? (s.tPerYr / maxSource) * (ROW_HEIGHT - 6) : 0;
          const isHighlighted =
            hovered === null ||
            (hovered.kind === 'source' && hovered.id === s.polygonId);
          return (
            <path
              key={`flow-source-${s.polygonId}`}
              d={`M ${x1} ${sy} C ${cx} ${sy}, ${cx} ${drainageY}, ${x2} ${drainageY}`}
              fill="none"
              className={`${styles.flow} ${isHighlighted ? '' : styles.flowDim}`}
              stroke="var(--color-accent-warm)"
              strokeWidth={Math.max(1.5, width)}
              opacity={isHighlighted ? 0.65 : 0.15}
            />
          );
        })}

        {/* Drainage → Fate flows */}
        {(['coastal', 'nearshore', 'offshore'] as const).map((fk, i) => {
          const value = fates[fk];
          const fy = PAD_TOP + i * ROW_HEIGHT + ROW_HEIGHT / 2;
          const x1 = COL_X.drainage + DRAINAGE_WIDTH;
          const x2 = COL_X.fates;
          const cx = (x1 + x2) / 2;
          const width = (value / totalFates) * (ROW_HEIGHT - 6);
          const isHighlighted =
            hovered === null ||
            (hovered.kind === 'fate' && hovered.id === fk);
          return (
            <path
              key={`flow-fate-${fk}`}
              d={`M ${x1} ${drainageY} C ${cx} ${drainageY}, ${cx} ${fy}, ${x2} ${fy}`}
              fill="none"
              className={`${styles.flow} ${isHighlighted ? '' : styles.flowDim}`}
              stroke="var(--color-accent)"
              strokeWidth={Math.max(1.5, width)}
              opacity={isHighlighted ? 0.7 : 0.15}
            />
          );
        })}

        {/* Source nodes */}
        {sources.map((s, i) => {
          const y = PAD_TOP + i * ROW_HEIGHT;
          return (
            <g
              key={`node-source-${s.polygonId}`}
              data-testid={`sankey-source-${s.polygonId}`}
              className={styles.node}
              onMouseEnter={() => setHovered({ kind: 'source', id: s.polygonId })}
              onMouseLeave={() => setHovered(null)}
              onClick={() => {
                setSelected({
                  layerId: 'watershed-polygons',
                  featureId: s.polygonId,
                } as SelectedPolygonRef);
              }}
            >
              <rect
                x={COL_X.sources}
                y={y + 4}
                width={COL_WIDTH}
                height={ROW_HEIGHT - 8}
                rx={2}
                className={styles.nodeRect}
              />
              <text
                x={COL_X.sources + 6}
                y={y + ROW_HEIGHT - 6}
                className={styles.nodeText}
              >
                {s.name}
              </text>
              <title>
                {s.name}: {formatTonnes(s.tPerYr)}
              </title>
            </g>
          );
        })}

        {/* Drainage node */}
        <g data-testid="sankey-drainage" className={styles.node}>
          <rect
            x={COL_X.drainage}
            y={drainageY - ROW_HEIGHT}
            width={DRAINAGE_WIDTH}
            height={ROW_HEIGHT * 2}
            rx={2}
            className={styles.nodeRectDrainage}
          />
          <text
            x={COL_X.drainage + DRAINAGE_WIDTH / 2}
            y={drainageY - 2}
            textAnchor="middle"
            className={styles.nodeText}
          >
            Drainage
          </text>
          <text
            x={COL_X.drainage + DRAINAGE_WIDTH / 2}
            y={drainageY + 12}
            textAnchor="middle"
            className={styles.nodeSubText}
          >
            {formatTonnes(transport.drainage_t_per_yr)}
          </text>
          <title>Drainage network · {formatTonnes(transport.drainage_t_per_yr)}</title>
        </g>

        {/* Fate nodes */}
        {(['coastal', 'nearshore', 'offshore'] as const).map((fk, i) => {
          const y = PAD_TOP + i * ROW_HEIGHT;
          return (
            <g
              key={`node-fate-${fk}`}
              data-testid={`sankey-fate-${fk}`}
              className={styles.node}
              onMouseEnter={() => setHovered({ kind: 'fate', id: fk })}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onFateClick?.(fk)}
            >
              <rect
                x={COL_X.fates}
                y={y + 4}
                width={COL_WIDTH}
                height={ROW_HEIGHT - 8}
                rx={2}
                className={styles.nodeRectFate}
              />
              <text
                x={COL_X.fates + 6}
                y={y + ROW_HEIGHT - 6}
                className={styles.nodeText}
              >
                {FATE_LABELS[fk]}
              </text>
              <title>
                {FATE_LABELS[fk]}: {formatTonnes(fates[fk])}
              </title>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
