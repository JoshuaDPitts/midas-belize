import type { PipelineRun } from '@/lib/data/types';
import styles from './SuccessRateChart.module.css';

interface TimestampLike {
  _seconds: number;
}

function toMs(ts: unknown): number {
  if (ts == null) return 0;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts === 'number') return ts;
  if (typeof ts === 'object' && typeof (ts as TimestampLike)._seconds === 'number') {
    return (ts as TimestampLike)._seconds * 1000;
  }
  if (typeof ts === 'string') {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

const DAY_MS = 24 * 3600 * 1000;

export interface DayBucket {
  day: string;
  total: number;
  success: number;
  successRate: number;
  startMs: number;
  endMs: number;
}

export function bucketByDay(
  runs: Array<PipelineRun & { id: string }>,
  now: number,
  windowDays = 7,
): DayBucket[] {
  const buckets: DayBucket[] = [];
  for (let d = windowDays - 1; d >= 0; d--) {
    const endMs = now - d * DAY_MS;
    const startMs = endMs - DAY_MS;
    const inDay = runs.filter((r) => {
      const t = toMs(r.started_at);
      return t >= startMs && t < endMs;
    });
    const success = inDay.filter((r) => r.status === 'success').length;
    const total = inDay.length;
    buckets.push({
      day: new Date(endMs).toISOString().slice(5, 10),
      total,
      success,
      successRate: total === 0 ? 0 : success / total,
      startMs,
      endMs,
    });
  }
  return buckets;
}

export interface SuccessRateChartProps {
  runs: Array<PipelineRun & { id: string }>;
  now?: number;
  windowDays?: number;
}

export function SuccessRateChart({
  runs,
  now = Date.now(),
  windowDays = 7,
}: SuccessRateChartProps) {
  const buckets = bucketByDay(runs, now, windowDays);
  const maxTotal = Math.max(1, ...buckets.map((b) => b.total));
  const allRuns = buckets.reduce((acc, b) => acc + b.total, 0);
  const allSuccess = buckets.reduce((acc, b) => acc + b.success, 0);
  const overallRate = allRuns === 0 ? 0 : Math.round((allSuccess / allRuns) * 100);

  return (
    <figure className={styles.figure} data-success-chart>
      <div
        className={styles.bars}
        role="img"
        aria-label={`${windowDays}-day success rate trend`}
      >
        {buckets.map((b) => {
          const heightPct = (b.total / maxTotal) * 100;
          const ratePct = Math.round(b.successRate * 100);
          return (
            <div
              key={b.startMs}
              className={styles.barWrap}
              title={`${b.day}: ${b.success}/${b.total} success (${ratePct}%)`}
              data-day={b.day}
            >
              <div className={styles.barTrack}>
                <div
                  className={styles.bar}
                  style={{ height: `${heightPct}%` }}
                  data-bar-total={b.total}
                >
                  {b.total > 0 && (
                    <div
                      className={styles.barSuccess}
                      style={{ height: `${ratePct}%` }}
                      data-bar-success={b.success}
                    />
                  )}
                </div>
              </div>
              <span className={styles.barLabel}>{b.day}</span>
            </div>
          );
        })}
      </div>
      <figcaption className={styles.caption}>
        <span className={styles.captionPrimary}>{overallRate}% success</span>
        <span className={styles.captionMeta}>
          {allRuns} run{allRuns === 1 ? '' : 's'} in last {windowDays} days
        </span>
      </figcaption>
    </figure>
  );
}
