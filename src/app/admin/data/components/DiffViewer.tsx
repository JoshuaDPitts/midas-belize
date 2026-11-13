import type { DatasetVersion } from '@/lib/data/types';
import { formatBytes } from './VersionHistoryTimeline';
import styles from './DiffViewer.module.css';

function signed(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n.toLocaleString()}` : n.toLocaleString();
}

function signedBytes(n: number): string {
  if (n === 0) return '0';
  const sign = n > 0 ? '+' : '−';
  return `${sign}${formatBytes(Math.abs(n))}`;
}

function sentiment(n: number): 'pos' | 'neg' | 'zero' {
  if (n > 0) return 'pos';
  if (n < 0) return 'neg';
  return 'zero';
}

function bboxesEqual(a: DatasetVersion['bbox'], b: DatasetVersion['bbox']): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

export interface DiffViewerProps {
  from: DatasetVersion;
  to: DatasetVersion;
}

export function DiffViewer({ from, to }: DiffViewerProps) {
  const featureDelta = (to.feature_count ?? 0) - (from.feature_count ?? 0);
  const sizeDelta = to.size_bytes - from.size_bytes;
  const bboxChanged = !bboxesEqual(from.bbox, to.bbox);

  return (
    <article className={styles.card} data-diff-viewer>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Diff</p>
        <p className={styles.versions}>
          <code className={styles.versionFrom}>{from.version}</code>
          <span aria-hidden="true">→</span>
          <code className={styles.versionTo}>{to.version}</code>
        </p>
      </header>
      <dl className={styles.metrics}>
        <div className={styles.metric}>
          <dt>Features</dt>
          <dd
            className={`${styles.delta} ${styles[`delta_${sentiment(featureDelta)}`]}`}
            data-sentiment={sentiment(featureDelta)}
          >
            {signed(featureDelta)}
          </dd>
        </div>
        <div className={styles.metric}>
          <dt>Size</dt>
          <dd
            className={`${styles.delta} ${styles[`delta_${sentiment(sizeDelta)}`]}`}
            data-sentiment={sentiment(sizeDelta)}
          >
            {signedBytes(sizeDelta)}
          </dd>
        </div>
        <div className={styles.metric}>
          <dt>Bounding box</dt>
          <dd className={`${styles.delta} ${bboxChanged ? styles.delta_pos : styles.delta_zero}`}>
            {bboxChanged ? 'Changed' : 'Unchanged'}
          </dd>
        </div>
      </dl>
      {bboxChanged && (
        <dl className={styles.bbox}>
          <dt>From</dt>
          <dd>{from.bbox.map((v) => v.toFixed(4)).join(', ')}</dd>
          <dt>To</dt>
          <dd>{to.bbox.map((v) => v.toFixed(4)).join(', ')}</dd>
        </dl>
      )}
    </article>
  );
}
