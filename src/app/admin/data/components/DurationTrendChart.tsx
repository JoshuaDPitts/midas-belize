import type { PipelineRun, PipelineRunStatus } from '@/lib/data/types';
import styles from './DurationTrendChart.module.css';

const STATUS_FILL: Record<PipelineRunStatus, string> = {
  running: 'var(--color-accent)',
  success: 'var(--color-status-success)',
  partial: 'var(--color-status-warning)',
  failed: 'var(--color-status-error)',
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const remSec = s % 60;
  return remSec === 0 ? `${m}m` : `${m}m ${remSec}s`;
}

export type DurationTrendEntry = PipelineRun & { id: string };

export interface DurationTrendChartProps {
  runs: DurationTrendEntry[];
  limit?: number;
}

const CHART_W = 100;
const CHART_H = 40;
const CHART_PAD = 2;

export function DurationTrendChart({ runs, limit = 50 }: DurationTrendChartProps) {
  const points = runs
    .filter((r): r is DurationTrendEntry & { duration_ms: number } => r.duration_ms != null)
    .slice(0, limit)
    .reverse();

  if (points.length === 0) {
    return (
      <p className={styles.empty} data-empty-trend>
        Not enough data to chart yet.
      </p>
    );
  }

  const maxDuration = Math.max(...points.map((p) => p.duration_ms));
  const denom = Math.max(1, points.length - 1);
  const usableH = CHART_H - 2 * CHART_PAD;

  return (
    <figure className={styles.figure} data-trend-chart>
      <svg
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        width="100%"
        height="80"
        preserveAspectRatio="none"
        role="img"
        aria-label={`Pipeline run duration trend, last ${points.length} runs`}
        className={styles.svg}
      >
        <line
          x1="0"
          x2={CHART_W}
          y1={CHART_H - CHART_PAD}
          y2={CHART_H - CHART_PAD}
          stroke="var(--glass-border-subtle)"
          strokeWidth="0.4"
        />
        {points.map((p, i) => {
          const x = (i / denom) * CHART_W;
          const ratio = maxDuration === 0 ? 0 : p.duration_ms / maxDuration;
          const y = CHART_H - CHART_PAD - ratio * usableH;
          return (
            <g key={`${p.id}-${i}`}>
              <line
                x1={x}
                x2={x}
                y1={CHART_H - CHART_PAD}
                y2={y}
                stroke={STATUS_FILL[p.status]}
                strokeOpacity="0.35"
                strokeWidth="0.6"
              />
              <circle cx={x} cy={y} r="1" fill={STATUS_FILL[p.status]}>
                <title>{`${p.id}: ${formatDuration(p.duration_ms)} (${p.status})`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.captionMeta}>{points.length} runs</span>
        <span className={styles.captionMeta}>max {formatDuration(maxDuration)}</span>
      </figcaption>
    </figure>
  );
}
