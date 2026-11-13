'use client';
import { useState } from 'react';
import type { FoodWebGuild } from '@/types/mimes';
import { useMarineCrossSignalsOptional } from './MarineCrossSignals';
import styles from './FoodWebDiagram.module.css';

interface FoodWebDiagramProps {
  guilds: FoodWebGuild[];
  /** Explicit override — useful in tests without a provider. When omitted, the
   *  component reads highlight state from the nearest MarineCrossSignalsProvider. */
  highlightGuildId?: string | null;
  width?: number;
  height?: number;
}

// OKLCH brand-keyed viz palette — uses CSS custom properties from tokens/viz.css.
// CSS vars resolve correctly in SVG fill/stroke attributes in all modern browsers.
// The hex fallbacks below are only used for SVG <filter> feFlood and gradient
// stopColor attributes which do NOT support CSS variables (per SVG spec).
const VIZ_VARS = [
  'var(--color-viz-1)',  // teal
  'var(--color-viz-2)',  // coral
  'var(--color-viz-3)',  // indigo
  'var(--color-viz-4)',  // amber
  'var(--color-viz-5)',  // magenta
  'var(--color-viz-6)',  // jade
  'var(--color-viz-7)',  // terra
  'var(--color-viz-8)',  // ocean
];

// Hex approximations of the OKLCH tokens — used ONLY where CSS variables are
// not supported: SVG filter feFlood and linearGradient stopColor attributes.
const VIZ_HEX = [
  '#2dd4bf', // viz-1 teal    oklch(72% 0.13 180)
  '#f87171', // viz-2 coral   oklch(70% 0.16 30)
  '#818cf8', // viz-3 indigo  oklch(65% 0.18 260)
  '#fbbf24', // viz-4 amber   oklch(75% 0.15 85)
  '#d946ef', // viz-5 magenta oklch(60% 0.20 320)
  '#4ade80', // viz-6 jade    oklch(70% 0.17 140)
  '#fb923c', // viz-7 terra   oklch(65% 0.20 55)
  '#38bdf8', // viz-8 ocean   oklch(55% 0.15 210)
];

const TROPHIC_LABELS = ['Producers', 'Primary Consumers', 'Secondary Consumers', 'Apex Predators'];

function formatBiomass(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, '').replace(/0$/, '');
}

function trophicLevel(g: FoodWebGuild, guilds: FoodWebGuild[]): number {
  if (g.preyIds.length === 0) return 0;
  return (
    1 +
    Math.max(
      ...g.preyIds.map((id) => {
        const prey = guilds.find((gg) => gg.id === id);
        return prey ? trophicLevel(prey, guilds) : 0;
      }),
    )
  );
}

export function FoodWebDiagram({
  guilds,
  highlightGuildId,
  width = 400,
  height = 340,
}: FoodWebDiagramProps) {
  // Consume cross-signal context; falls back to null when used outside a provider
  // (e.g., prop-only test fixtures — explicit prop takes precedence over context).
  const ctx = useMarineCrossSignalsOptional();
  const ctxHighlight = ctx?.highlightedGuildId ?? null;
  const setCtxHighlight = ctx?.setHighlightedGuildId ?? null;

  // Explicit prop overrides context; undefined means "use context".
  const effectiveHighlight =
    highlightGuildId !== undefined ? highlightGuildId : ctxHighlight;

  // Local hover state for microinteraction polish.
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [tableOpen, setTableOpen] = useState(false);

  if (guilds.length === 0) {
    return (
      <figure className={styles.figure}>
        <figcaption className={styles.figcaption}>Food-web flow (0 guilds)</figcaption>
        <div data-testid="foodweb-empty" className={styles.empty}>
          No guild data available.
        </div>
      </figure>
    );
  }

  const maxBiomass = Math.max(...guilds.map((g) => g.biomass));
  const idIndex = new Map(guilds.map((g, i) => [g.id, i]));

  // --- trophic-level computation (preserved from legacy) ---
  const levels = guilds.map((g) => trophicLevel(g, guilds));
  const maxLevel = Math.max(...levels);

  // First pass: count how many guilds sit at each level
  const levelCounts = new Map<number, number>();
  levels.forEach((lv) => levelCounts.set(lv, (levelCounts.get(lv) ?? 0) + 1));

  // Second pass: assign x positions using the indexInLevel counter
  const levelGroups = new Map<number, number>();
  const positions = guilds.map((_, i) => {
    const lv = levels[i];
    const count = levelGroups.get(lv) ?? 0;
    levelGroups.set(lv, count + 1);
    const y = height - 50 - (maxLevel > 0 ? (lv / maxLevel) * (height - 100) : 0);
    return { x: 0, y, level: lv, indexInLevel: count };
  });

  positions.forEach((p) => {
    const total = levelCounts.get(p.level) ?? 1;
    const spacing = width / (total + 1);
    p.x = spacing * (p.indexInLevel + 1);
  });

  // --- edge list (predator → prey) ---
  const edges: { fromIdx: number; toIdx: number; preyId: string; predId: string }[] = [];
  guilds.forEach((g) => {
    g.preyIds.forEach((preyId) => {
      const fromIdx = idIndex.get(preyId);
      const toIdx = idIndex.get(g.id);
      if (fromIdx !== undefined && toIdx !== undefined) {
        edges.push({ fromIdx, toIdx, preyId, predId: g.id });
      }
    });
  });

  const hasHighlight = effectiveHighlight !== null;
  const anyHovered = hoveredId !== null;

  return (
    <figure className={styles.figure}>
      <figcaption className={styles.figcaption}>
        Food-web flow ({guilds.length} guilds)
      </figcaption>

      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        role="img"
        aria-label="Food web trophic diagram"
        data-any-hovered={anyHovered ? 'true' : 'false'}
      >
        <defs>
          {/* Per-node glow filters */}
          {guilds.map((_, i) => (
            <filter
              key={`glow-${i}`}
              id={`fw-glow-${i}`}
              x="-80%"
              y="-80%"
              width="260%"
              height="260%"
            >
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feFlood
                floodColor={VIZ_HEX[i % VIZ_HEX.length]}
                floodOpacity="0.35"
                result="color"
              />
              <feComposite in="color" in2="blur" operator="in" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}

          {/* Arrow marker */}
          <marker
            id="fw-arrow"
            viewBox="0 0 10 8"
            refX="10"
            refY="4"
            markerWidth="7"
            markerHeight="5"
            orient="auto-start-reverse"
          >
            <path d="M0,1 L8,4 L0,7 Z" fill="rgba(200,210,230,0.5)" />
          </marker>

          {/* Edge gradients */}
          {edges.map(({ fromIdx, toIdx, preyId, predId }) => (
            <linearGradient
              key={`grad-${preyId}-${predId}`}
              id={`fw-edge-${preyId}-${predId}`}
              x1={positions[fromIdx].x}
              y1={positions[fromIdx].y}
              x2={positions[toIdx].x}
              y2={positions[toIdx].y}
              gradientUnits="userSpaceOnUse"
            >
              <stop
                offset="0%"
                stopColor={VIZ_HEX[fromIdx % VIZ_HEX.length]}
                stopOpacity="0.5"
              />
              <stop
                offset="100%"
                stopColor={VIZ_HEX[toIdx % VIZ_HEX.length]}
                stopOpacity="0.5"
              />
            </linearGradient>
          ))}

          {/* Radial gradients for node fills */}
          {guilds.map((_, i) => {
            const hex = VIZ_HEX[i % VIZ_HEX.length];
            return (
              <radialGradient key={`nodegrad-${i}`} id={`fw-node-${i}`} cx="50%" cy="50%">
                <stop offset="0%"   stopColor={hex} stopOpacity="0.95" />
                <stop offset="100%" stopColor={hex} stopOpacity="0.7" />
              </radialGradient>
            );
          })}
        </defs>

        {/* Trophic level guide bands */}
        {Array.from({ length: maxLevel + 1 }, (_, lv) => {
          const bandY = height - 50 - (maxLevel > 0 ? (lv / maxLevel) * (height - 100) : 0);
          return (
            <g key={`band-${lv}`} className={styles.trophicBand}>
              <line
                x1={20}
                y1={bandY}
                x2={width - 20}
                y2={bandY}
                stroke="var(--glass-border-subtle)"
                strokeWidth={1}
                strokeDasharray="4 8"
              />
              <text
                x={14}
                y={bandY - 6}
                fontSize={9}
                className={styles.trophicLabel}
              >
                {TROPHIC_LABELS[lv] ?? `TL${lv}`}
              </text>
            </g>
          );
        })}

        {/* Edges */}
        {edges.map(({ fromIdx, toIdx, preyId, predId }) => {
          const from = positions[fromIdx];
          const to = positions[toIdx];
          const toR = 10 + (guilds[toIdx].biomass / maxBiomass) * 18;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const endX = to.x - (dx / dist) * (toR + 6);
          const endY = to.y - (dy / dist) * (toR + 6);

          let edgeClass = styles.edge;
          if (hasHighlight) {
            const touches =
              guilds[fromIdx].id === effectiveHighlight ||
              guilds[toIdx].id === effectiveHighlight;
            edgeClass = touches ? styles.edgeHighlighted : styles.edgeDimmed;
          }

          return (
            <line
              key={`${preyId}-${predId}`}
              data-edge
              x1={from.x}
              y1={from.y}
              x2={endX}
              y2={endY}
              stroke={`url(#fw-edge-${preyId}-${predId})`}
              strokeWidth={2.5}
              markerEnd="url(#fw-arrow)"
              className={edgeClass}
            >
              <title>{`${guilds[toIdx].name} preys on ${guilds[fromIdx].name}`}</title>
            </line>
          );
        })}

        {/* Flow particles along edges */}
        {edges.map(({ fromIdx, toIdx, preyId, predId }, ei) => {
          const from = positions[fromIdx];
          const to = positions[toIdx];
          const toR = 10 + (guilds[toIdx].biomass / maxBiomass) * 18;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const endX = to.x - (dx / dist) * (toR + 6);
          const endY = to.y - (dy / dist) * (toR + 6);

          return (
            <circle
              key={`particle-${preyId}-${predId}`}
              r={3}
              fill={VIZ_VARS[fromIdx % VIZ_VARS.length]}
              opacity={0}
              className={styles.flowParticle}
              style={{
                offsetPath: `path("M${from.x},${from.y} L${endX},${endY}")`,
                animationDelay: `${ei * 0.7}s`,
              } as React.CSSProperties}
            >
              <animate
                attributeName="opacity"
                values="0;1;1;0"
                keyTimes="0;0.1;0.9;1"
                dur="2.5s"
                begin={`${ei * 0.7}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {/* Nodes */}
        {guilds.map((g, i) => {
          const r = 10 + (g.biomass / maxBiomass) * 18;
          // Use CSS var for stroke/fill (resolved at paint time; supported in modern SVG)
          const color = VIZ_VARS[i % VIZ_VARS.length];
          const isHighlighted = g.id === effectiveHighlight;
          const isDimmed = hasHighlight && !isHighlighted;
          const isHovered = g.id === hoveredId;

          return (
            <g
              key={g.id}
              data-testid={`foodweb-node-${g.id}`}
              data-biomass={g.biomass}
              data-highlighted={String(isHighlighted)}
              data-hovered={isHovered ? 'true' : 'false'}
              onMouseEnter={() => setHoveredId(g.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={setCtxHighlight ? () => setCtxHighlight(g.id) : undefined}
              style={setCtxHighlight ? { cursor: 'pointer' } : undefined}
              className={[
                styles.node,
                isDimmed ? styles.nodeDimmed : '',
                isHovered ? styles.nodeHovered : '',
                anyHovered && !isHovered ? styles.nodeUnhovered : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* Pulsing outer glow ring */}
              <circle
                cx={positions[i].x}
                cy={positions[i].y}
                r={r + 8}
                fill="none"
                stroke={color}
                strokeWidth={isHighlighted ? 2 : 1.5}
                className={
                  isHighlighted ? styles.nodeGlowRingHighlighted : styles.nodeGlowRing
                }
              />
              {/* Outer decorative ring */}
              <circle
                cx={positions[i].x}
                cy={positions[i].y}
                r={r + 3}
                fill="none"
                stroke={color}
                strokeWidth={1}
                opacity={isHighlighted ? 0.5 : 0.25}
              />
              {/* Main node circle with radial gradient + glow */}
              <circle
                cx={positions[i].x}
                cy={positions[i].y}
                r={r}
                fill={`url(#fw-node-${i})`}
                filter={`url(#fw-glow-${i})`}
                className={styles.nodeCircle}
              />
              {/* Biomass value (shown when node is large enough) */}
              {r > 14 && (
                <>
                  <text
                    x={positions[i].x}
                    y={positions[i].y + 5}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="800"
                    fill="rgba(0,0,0,0.4)"
                    fontFamily="var(--font-mono)"
                  >
                    {formatBiomass(g.biomass)}
                  </text>
                  <text
                    x={positions[i].x}
                    y={positions[i].y + 4}
                    textAnchor="middle"
                    fontSize={13}
                    fontWeight="800"
                    fill="#fff"
                    fontFamily="var(--font-mono)"
                    className={styles.nodeText}
                  >
                    {formatBiomass(g.biomass)}
                  </text>
                </>
              )}
              {/* Label pill */}
              <rect
                x={positions[i].x - g.name.length * 3.5 - 6}
                y={positions[i].y + r + 6}
                width={g.name.length * 7 + 12}
                height={18}
                rx={9}
                fill="rgba(8,12,21,0.7)"
              />
              <text
                x={positions[i].x}
                y={positions[i].y + r + 19}
                textAnchor="middle"
                fontSize={12}
                fontWeight="700"
                fill={isHighlighted ? color : '#fff'}
                fontFamily="var(--font-display)"
                className={styles.nodeLabel}
              >
                {g.name}
              </text>
            </g>
          );
        })}
      </svg>

      {/* View as table toggle */}
      <div className={styles.tableToggleRow}>
        <button
          type="button"
          className={styles.tableToggle}
          onClick={() => setTableOpen((p) => !p)}
          aria-expanded={tableOpen}
        >
          {tableOpen ? 'Hide table' : 'View as table'}
        </button>
      </div>

      {tableOpen && (
        <table role="table" className={styles.dataTable}>
          <thead>
            <tr role="row">
              <th role="columnheader">Guild</th>
              <th role="columnheader">Biomass</th>
              <th role="columnheader">Prey count</th>
            </tr>
          </thead>
          <tbody>
            {guilds.map((g) => (
              <tr role="row" key={g.id}>
                <td role="cell">{g.name}</td>
                <td role="cell">{g.biomass.toFixed(1)}</td>
                <td role="cell">{g.preyIds.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </figure>
  );
}
