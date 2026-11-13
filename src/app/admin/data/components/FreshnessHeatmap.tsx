import type { CatalogEntry } from '@/lib/data/types';
import styles from './FreshnessHeatmap.module.css';

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

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

export type FreshnessBucket = 'fresh' | 'stale' | 'old' | 'unknown';

export function bucketForAge(ageMs: number): FreshnessBucket {
  if (!Number.isFinite(ageMs) || ageMs < 0) return 'unknown';
  if (ageMs < DAY_MS) return 'fresh';
  if (ageMs < 7 * DAY_MS) return 'stale';
  return 'old';
}

function formatAge(ageMs: number): string {
  if (!Number.isFinite(ageMs) || ageMs < 0) return '—';
  if (ageMs < HOUR_MS) return `${Math.round(ageMs / 60_000)}m`;
  if (ageMs < DAY_MS) return `${Math.round(ageMs / HOUR_MS)}h`;
  return `${Math.round(ageMs / DAY_MS)}d`;
}

export interface FreshnessHeatmapProps {
  datasets: CatalogEntry[];
  now?: number;
}

export function FreshnessHeatmap({ datasets, now = Date.now() }: FreshnessHeatmapProps) {
  if (datasets.length === 0) {
    return (
      <p className={styles.empty} data-empty-heatmap>
        No datasets to display.
      </p>
    );
  }

  let fresh = 0;
  let stale = 0;
  let old = 0;
  let unknown = 0;
  const cells = datasets.map((d) => {
    const ts = toMs(d.updated_at);
    const ageMs = ts === 0 ? Infinity : now - ts;
    const bucket = bucketForAge(ageMs);
    if (bucket === 'fresh') fresh += 1;
    else if (bucket === 'stale') stale += 1;
    else if (bucket === 'old') old += 1;
    else unknown += 1;
    return { id: d.id, bucket, ageMs };
  });

  return (
    <figure className={styles.figure} data-heatmap>
      <div
        className={styles.grid}
        role="img"
        aria-label="Dataset freshness heatmap"
      >
        {cells.map((c) => (
          <span
            key={c.id}
            className={`${styles.cell} ${styles[`cell_${c.bucket}`]}`}
            title={`${c.id} — ${formatAge(c.ageMs)} old`}
            data-bucket={c.bucket}
            data-dataset={c.id}
          />
        ))}
      </div>
      <figcaption className={styles.caption}>
        <span className={`${styles.legendItem} ${styles.legendFresh}`}>
          <span className={styles.legendSwatch} aria-hidden="true" />
          {fresh} fresh
        </span>
        <span className={`${styles.legendItem} ${styles.legendStale}`}>
          <span className={styles.legendSwatch} aria-hidden="true" />
          {stale} stale
        </span>
        <span className={`${styles.legendItem} ${styles.legendOld}`}>
          <span className={styles.legendSwatch} aria-hidden="true" />
          {old} old
        </span>
        {unknown > 0 && (
          <span className={`${styles.legendItem} ${styles.legendUnknown}`}>
            <span className={styles.legendSwatch} aria-hidden="true" />
            {unknown} unknown
          </span>
        )}
      </figcaption>
    </figure>
  );
}
