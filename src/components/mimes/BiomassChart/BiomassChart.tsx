import type { TimePoint } from '@/types/mimes';
import styles from './BiomassChart.module.css';

const VIZ_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
];

interface BiomassChartProps {
  data: TimePoint[];
  guildNames: string[];
  width?: number;
  height?: number;
}

export function BiomassChart({ data, guildNames, width = 360, height = 200 }: BiomassChartProps) {
  if (data.length < 2 || guildNames.length === 0) return null;

  const pad = { top: 12, right: 12, bottom: 24, left: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Compute stacked values
  const stacked = data.map((tp) => {
    let cumulative = 0;
    return guildNames.map((name) => {
      const prev = cumulative;
      cumulative += tp.values[name] ?? 0;
      return { y0: prev, y1: cumulative };
    });
  });

  const maxY = Math.max(...stacked.map((s) => s[s.length - 1]?.y1 ?? 0));

  const toX = (i: number) => pad.left + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => pad.top + chartH - (v / maxY) * chartH;

  // Build smooth area paths
  const buildAreaPath = (gi: number): string => {
    const topPoints = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y1)}`);
    const bottomPoints = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y0)}`).reverse();
    return `M${topPoints.join(' L')} L${bottomPoints.join(' L')} Z`;
  };

  // Horizontal grid lines
  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount }, (_, i) => {
    const val = (maxY / (gridCount + 1)) * (i + 1);
    return toY(val);
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Biomass Composition</span>
      </div>

      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={styles.svg}>
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
          {/* Glow filter for top edges */}
          <filter id="bc-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Subtle horizontal grid */}
        {gridLines.map((y, i) => (
          <line key={`grid-${i}`} x1={pad.left} y1={y} x2={pad.left + chartW} y2={y}
            stroke="var(--glass-border-subtle)" strokeWidth={1} />
        ))}

        {/* Stacked areas */}
        {guildNames.map((name, gi) => (
          <path
            key={name}
            data-series={name}
            d={buildAreaPath(gi)}
            fill={`url(#bc-area-${gi})`}
          />
        ))}

        {/* Top edge glow lines for each area */}
        {guildNames.map((name, gi) => {
          const points = data.map((_, i) => `${toX(i)},${toY(stacked[i][gi].y1)}`);
          return (
            <polyline
              key={`edge-${name}`}
              points={points.join(' ')}
              fill="none"
              stroke={VIZ_COLORS[gi % VIZ_COLORS.length]}
              strokeWidth={1.5}
              opacity={0.6}
              filter="url(#bc-glow)"
            />
          );
        })}

        {/* X-axis labels */}
        {data.map((tp, i) => (
          i % Math.max(1, Math.floor(data.length / 4)) === 0 ? (
            <text key={tp.date} x={toX(i)} y={height - 4} textAnchor="middle" fontSize={9}
              fill="rgba(255,255,255,0.35)" fontFamily="var(--font-mono)" fontWeight="500">
              {tp.date}
            </text>
          ) : null
        ))}

        {/* Bottom axis line */}
        <line x1={pad.left} y1={pad.top + chartH} x2={pad.left + chartW} y2={pad.top + chartH}
          stroke="var(--glass-border-subtle)" strokeWidth={1} />
      </svg>

      {/* Legend pills */}
      <div className={styles.legend}>
        {guildNames.map((name, gi) => (
          <div key={name} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ backgroundColor: VIZ_COLORS[gi % VIZ_COLORS.length], color: VIZ_COLORS[gi % VIZ_COLORS.length] }} />
            <span className={styles.legendLabel}>{name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
