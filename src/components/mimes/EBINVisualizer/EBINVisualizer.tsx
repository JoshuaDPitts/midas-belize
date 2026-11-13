import type { EBINEntry } from '@/types/mimes';
import styles from './EBINVisualizer.module.css';

const ECOSYSTEM_COLORS: Record<string, [string, string]> = {
  mangrove: ['#16A34A', '#4ADE80'],
  seagrass: ['#0D9488', '#2DD4BF'],
  coral: ['#DC2626', '#FB923C'],
  sand: ['#A16207', '#EAB308'],
};

interface EBINVisualizerProps {
  bins: EBINEntry[];
  width?: number;
  height?: number;
}

export function EBINVisualizer({ bins, width = 420, height = 320 }: EBINVisualizerProps) {
  if (bins.length === 0) return null;

  // Sort bins by minDepth (shallowest first)
  const sorted = [...bins].sort((a, b) => a.minDepth - b.minDepth);
  const minD = Math.min(...sorted.map((b) => b.minDepth));
  const maxD = Math.max(...sorted.map((b) => b.maxDepth));
  const range = maxD - minD || 1;

  const padLeft = 52;
  const padRight = 16;
  const padTop = 24;
  const padBottom = 16;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  const toY = (depth: number) => padTop + ((depth - minD) / range) * chartH;
  const waterY = toY(0);

  // Depth ticks
  const step = range <= 10 ? 2 : range <= 20 ? 5 : 10;
  const ticks: number[] = [];
  for (let d = Math.ceil(minD / step) * step; d <= maxD; d += step) {
    ticks.push(d);
  }

  return (
    <div className={styles.container}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
        <defs>
          <linearGradient id="ebin-water-bg" x1="0" y1={waterY} x2="0" y2={height} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0284C7" stopOpacity="0.12" />
            <stop offset="60%" stopColor="#0C4A6E" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#082F49" stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="ebin-sky-bg" x1="0" y1="0" x2="0" y2={waterY} gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#7DD3FC" stopOpacity="0.04" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.08" />
          </linearGradient>
          {/* Bin gradients */}
          {sorted.map((bin, i) => {
            const colors = ECOSYSTEM_COLORS[bin.ecosystemType] ?? ['#3B82F6', '#60A5FA'];
            const y1 = toY(bin.minDepth);
            const y2 = toY(bin.maxDepth);
            return (
              <linearGradient key={`bingrad-${i}`} id={`ebin-fill-${i}`} x1="0" y1={y1} x2="0" y2={y2} gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor={colors[1]} stopOpacity="0.8" />
                <stop offset="100%" stopColor={colors[0]} stopOpacity="0.95" />
              </linearGradient>
            );
          })}
          {/* Water surface shimmer */}
          <filter id="ebin-shimmer">
            <feTurbulence type="fractalNoise" baseFrequency="0.03 0.005" numOctaves="2" seed="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>

        {/* Background zones */}
        <rect x={padLeft} y={padTop} width={chartW} height={Math.max(0, waterY - padTop)} fill="url(#ebin-sky-bg)" />
        <rect x={padLeft} y={waterY} width={chartW} height={Math.max(0, padTop + chartH - waterY)} fill="url(#ebin-water-bg)" />

        {/* Depth grid */}
        {ticks.map((d) => (
          <g key={`tick-${d}`}>
            <line x1={padLeft} y1={toY(d)} x2={padLeft + chartW} y2={toY(d)} stroke="var(--glass-border-subtle)" strokeWidth={1} />
            <text x={padLeft - 8} y={toY(d) + 4} textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.3)" fontFamily="var(--font-mono)">
              {d}m
            </text>
          </g>
        ))}

        {/* Ecosystem bins — full width, stacked vertically */}
        {sorted.map((bin, i) => {
          const y1 = toY(bin.minDepth);
          const y2 = toY(bin.maxDepth);
          const top = Math.min(y1, y2);
          const h = Math.max(Math.abs(y2 - y1), 20); // minimum visual height
          const colors = ECOSYSTEM_COLORS[bin.ecosystemType] ?? ['#3B82F6', '#60A5FA'];
          return (
            <g key={bin.binLabel}>
              {/* Main fill */}
              <rect data-bin x={padLeft + 1} y={top} width={chartW - 2} height={h} fill={`url(#ebin-fill-${i})`} />
              {/* Top edge highlight */}
              <line x1={padLeft + 1} y1={top} x2={padLeft + chartW - 1} y2={top} stroke="var(--glass-border-strong)" strokeWidth={1} />
              {/* Side glow */}
              <rect x={padLeft + 1} y={top} width={4} height={h} fill={colors[1]} opacity={0.4} />
              {/* Label */}
              <rect
                x={padLeft + chartW / 2 - bin.binLabel.length * 4.2 - 12}
                y={top + h / 2 - 11}
                width={bin.binLabel.length * 8.4 + 24}
                height={22}
                rx={11}
                fill="rgba(0,0,0,0.45)"
              />
              <text x={padLeft + chartW / 2} y={top + h / 2 + 4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#fff">
                {bin.binLabel}
              </text>
              {/* Depth range on right side */}
              <text x={padLeft + chartW - 8} y={top + h / 2 + 4} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.5)" fontFamily="var(--font-mono)">
                {bin.minDepth}–{bin.maxDepth}m
              </text>
            </g>
          );
        })}

        {/* Water surface — bright line with label */}
        <line x1={padLeft} y1={waterY} x2={padLeft + chartW} y2={waterY} stroke="#38BDF8" strokeWidth={2.5} opacity={0.7} />
        {/* Surface ripple effect */}
        <line x1={padLeft} y1={waterY} x2={padLeft + chartW} y2={waterY} stroke="#7DD3FC" strokeWidth={1} opacity={0.4} strokeDasharray="8 12" />
        <text x={padLeft - 8} y={waterY + 4} textAnchor="end" fontSize={11} fontWeight="700" fill="#38BDF8" fontFamily="var(--font-mono)">
          0m
        </text>

        {/* Y-axis label */}
        <text x={16} y={height / 2} textAnchor="middle" fontSize={10} fill="rgba(255,255,255,0.25)" fontFamily="var(--font-mono)" transform={`rotate(-90, 16, ${height / 2})`}>
          Depth
        </text>

        {/* Chart border */}
        <rect x={padLeft} y={padTop} width={chartW} height={chartH} fill="none" stroke="var(--glass-border-subtle)" strokeWidth={1} />
      </svg>
    </div>
  );
}
