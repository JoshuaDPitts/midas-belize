'use client';
import { useState, useRef, useCallback } from 'react';
import type { TimePoint } from '@/types/mimes';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import styles from './BiomassChart.module.css';

// OKLCH categorical palette from --color-viz-1..8 (design system viz.css tokens).
// Expressed as CSS variable references so they pick up the correct values at runtime.
// Fallback hex values match the OKLCH approximations for environments that don't
// support oklch() — the legacy hex array is preserved as a fallback comment.
// Legacy: ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6','#EC4899','#06B6D4','#F97316']
const VIZ_COLORS = [
  'var(--color-viz-1)',
  'var(--color-viz-2)',
  'var(--color-viz-3)',
  'var(--color-viz-4)',
  'var(--color-viz-5)',
  'var(--color-viz-6)',
  'var(--color-viz-7)',
  'var(--color-viz-8)',
];

// Hex fallbacks for inline style usage (CSS vars work in SVG fill attr, but not
// in JS-side style computations like tooltip swatch backgrounds).
const VIZ_HEX_FALLBACKS = [
  '#2dd4bf', '#f87171', '#818cf8', '#fbbf24',
  '#d946ef', '#4ade80', '#fb923c', '#38bdf8',
];

interface BiomassChartProps {
  data: TimePoint[];
  guildNames: string[];
  width?: number;
  height?: number;
}

export function BiomassChart({ data, guildNames, width = 360, height = 200 }: BiomassChartProps) {
  const [hiddenGuilds, setHiddenGuilds] = useState<Set<string>>(new Set());
  const [hoveredStack, setHoveredStack] = useState<string | null>(null);
  const [playheadX, setPlayheadX] = useState<number | null>(null);
  const [playheadIdx, setPlayheadIdx] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (data.length < 2 || guildNames.length === 0) return null;

  function toggleGuild(name: string) {
    setHiddenGuilds((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const pad = { top: 16, right: 16, bottom: 28, left: 32 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Only visible guilds participate in stacking
  const visibleGuilds = guildNames.filter((g) => !hiddenGuilds.has(g));

  // Compute stacked values using only visible guilds (re-stacks when toggling).
  const stacked = data.map((tp) => {
    let cumulative = 0;
    return guildNames.map((name) => {
      if (hiddenGuilds.has(name)) return { y0: 0, y1: 0 };
      const prev = cumulative;
      cumulative += tp.values[name] ?? 0;
      return { y0: prev, y1: cumulative };
    });
  });

  // Max Y uses visible stacking only
  const maxY = Math.max(
    ...stacked.map((s) => {
      const topBand = visibleGuilds.length > 0
        ? s[guildNames.indexOf(visibleGuilds[visibleGuilds.length - 1])]?.y1 ?? 0
        : 0;
      return topBand;
    }),
    1,
  );

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => pad.top + chartH - (v / maxY) * chartH;

  // Build smooth area paths.
  const buildAreaPath = (gi: number): string => {
    if (hiddenGuilds.has(guildNames[gi])) {
      // Collapsed to baseline — path still exists for transitions
      const baseline = toY(0);
      const topPoints = data.map((_, i) => `${toX(i)},${baseline}`);
      const bottomPoints = [...topPoints].reverse();
      return `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`;
    }
    const topPoints = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y1)}`);
    const bottomPoints = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y0)}`).reverse();
    return `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`;
  };

  // Y-axis tick count and values
  const yTickCount = 5;
  const yTicks = Array.from({ length: yTickCount }, (_, i) => {
    const val = (maxY / (yTickCount - 1)) * i;
    return { val, y: toY(val) };
  });

  // Mouse move handler — update playhead position
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * width;
    const relX = svgX - pad.left;
    const t = Math.max(0, Math.min(1, relX / chartW));
    const rawIdx = t * (data.length - 1);
    const idx = Math.round(rawIdx);
    setPlayheadX(toX(idx));
    setPlayheadIdx(idx);
  }, [width, chartW, data.length, pad.left]);

  const handleMouseLeave = useCallback(() => {
    setPlayheadX(null);
    setPlayheadIdx(null);
    setHoveredStack(null);
  }, []);

  const anyHovered = hoveredStack !== null;

  return (
    <figure data-testid="biomass-chart" className={styles.figure}>
      <figcaption className={styles.figcaption}>
        {`Biomass over time (${guildNames.length} guilds)`}
        <FormulaTooltip
          label="Biomass (stacked)"
          formula="stack(t, g) = Σ over [g0..g] of biomass(t, gi)"
          explanation="Each guild's biomass is stacked on top of the previous, so the topmost line equals the total ecosystem biomass at time t."
        />
      </figcaption>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className={styles.svg}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          {/* Area fill gradients — top-to-bottom fade */}
          {guildNames.map((_, gi) => {
            const color = VIZ_COLORS[gi % VIZ_COLORS.length];
            return (
              <linearGradient key={`areagrad-${gi}`} id={`bc-area-${gi}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.85" />
                <stop offset="100%" stopColor={color} stopOpacity="0.5" />
              </linearGradient>
            );
          })}
          {/* Glow filter for top edge lines */}
          <filter id="bc-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Y-axis ticks + gridlines */}
        {yTicks.map(({ val, y }) => (
          <g key={`ytick-${val}`}>
            <line
              x1={pad.left}
              y1={y}
              x2={pad.left + chartW}
              y2={y}
              stroke="var(--glass-border-subtle)"
              strokeWidth={1}
              strokeDasharray="2 6"
            />
            <text
              x={pad.left - 4}
              y={y + 4}
              textAnchor="end"
              fontSize={8}
              fill="var(--color-text-tertiary)"
              fontFamily="var(--font-mono)"
            >
              {Math.round(val)}
            </text>
          </g>
        ))}

        {/* Stacked areas */}
        {guildNames.map((name, gi) => {
          const isHidden = hiddenGuilds.has(name);
          const isHoveredStack = hoveredStack === name;
          const dimmed = anyHovered && !isHoveredStack;
          return (
            <path
              key={name}
              data-testid={`biomass-stack-${name}`}
              data-series={name}
              data-hidden={isHidden ? 'true' : 'false'}
              d={buildAreaPath(gi)}
              fill={`url(#bc-area-${gi})`}
              style={{
                opacity: isHidden ? 0 : dimmed ? 0.3 : 1,
                transition: 'opacity 300ms var(--ease-out)',
                pointerEvents: isHidden ? 'none' : 'auto',
              }}
              onMouseEnter={() => setHoveredStack(name)}
            />
          );
        })}

        {/* Top edge glow lines */}
        {guildNames.map((name, gi) => {
          if (hiddenGuilds.has(name)) return null;
          const isHoveredStack = hoveredStack === name;
          const dimmed = anyHovered && !isHoveredStack;
          const points = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y1)}`);
          return (
            <polyline
              key={`edge-${name}`}
              points={points.join(' ')}
              fill="none"
              stroke={VIZ_COLORS[gi % VIZ_COLORS.length]}
              strokeWidth={isHoveredStack ? 2 : 1.5}
              opacity={dimmed ? 0.2 : 0.6}
              style={{ transition: 'opacity 300ms var(--ease-out)' }}
              filter="url(#bc-glow)"
              onMouseEnter={() => setHoveredStack(name)}
            />
          );
        })}

        {/* Hover playhead */}
        {playheadX !== null && (
          <line
            x1={playheadX}
            y1={pad.top}
            x2={playheadX}
            y2={pad.top + chartH}
            stroke="var(--color-accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
            opacity={0.7}
            style={{ pointerEvents: 'none' }}
          />
        )}

        {/* X-axis date labels */}
        {data.map((tp, i) =>
          i % Math.max(1, Math.floor(data.length / 4)) === 0 ? (
            <text
              key={tp.date}
              x={toX(i)}
              y={height - 4}
              textAnchor="middle"
              fontSize={9}
              fill="var(--color-text-tertiary)"
              fontFamily="var(--font-mono)"
              fontWeight="500"
            >
              {tp.date}
            </text>
          ) : null,
        )}

        {/* Bottom axis line */}
        <line
          x1={pad.left}
          y1={pad.top + chartH}
          x2={pad.left + chartW}
          y2={pad.top + chartH}
          stroke="var(--glass-border-subtle)"
          strokeWidth={1}
        />

        {/* Left axis line */}
        <line
          x1={pad.left}
          y1={pad.top}
          x2={pad.left}
          y2={pad.top + chartH}
          stroke="var(--glass-border-subtle)"
          strokeWidth={1}
        />
      </svg>

      {/* Hover tooltip — per-guild values at playhead index */}
      {playheadIdx !== null && data[playheadIdx] && (
        <div className={styles.hoverTooltip}>
          <span className={styles.hoverTooltipDate}>{data[playheadIdx].date}</span>
          {guildNames
            .filter((g) => !hiddenGuilds.has(g))
            .map((name, _) => {
              const gi = guildNames.indexOf(name);
              const val = data[playheadIdx!].values[name] ?? 0;
              return (
                <span key={name} className={styles.hoverTooltipRow}>
                  <span
                    className={styles.hoverTooltipSwatch}
                    style={{ background: VIZ_HEX_FALLBACKS[gi % VIZ_HEX_FALLBACKS.length] }}
                  />
                  <span className={styles.hoverTooltipLabel}>{name}</span>
                  <span className={styles.hoverTooltipVal}>{val.toFixed(1)}</span>
                </span>
              );
            })}
        </div>
      )}

      {/* Legend chips — now interactive buttons with aria-pressed */}
      <div className={styles.legend}>
        {guildNames.map((name, gi) => {
          const isHidden = hiddenGuilds.has(name);
          return (
            <button
              key={name}
              type="button"
              data-testid={`biomass-legend-${name}`}
              aria-pressed={!isHidden}
              onClick={() => toggleGuild(name)}
              className={[styles.legendChip, isHidden ? styles.legendChipHidden : ''].filter(Boolean).join(' ')}
            >
              <span
                className={styles.legendDot}
                style={{
                  backgroundColor: VIZ_COLORS[gi % VIZ_COLORS.length],
                  color: VIZ_COLORS[gi % VIZ_COLORS.length],
                  opacity: isHidden ? 0.3 : 1,
                }}
              />
              <span className={styles.legendLabel}>{name}</span>
            </button>
          );
        })}
      </div>
    </figure>
  );
}
