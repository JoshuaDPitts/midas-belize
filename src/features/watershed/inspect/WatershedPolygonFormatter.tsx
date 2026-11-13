'use client';
import { useSetAtom } from 'jotai';
import { selectedPolygonAtom, sidebarPanelAtom, type SelectedPolygonRef } from '@/atoms';
import type { InspectFormatterProps } from '@/features/_types';
import styles from './WatershedPolygonFormatter.module.css';

function readNumber(props: Record<string, unknown>, key: string): number | null {
  const v = props[key];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

function polygonKey(props: Record<string, unknown>): string | number | null {
  const raw = props.Name ?? props.WATERSHED ?? props.MIMES_ID;
  if (raw === undefined || raw === null || raw === '') return null;
  return raw as string | number;
}

function nbsToColor(score: number): string {
  const t = Math.min(1, Math.max(-1, score));
  if (t >= 0) {
    return `color-mix(in oklch, var(--color-accent) ${Math.round(t * 100)}%, var(--color-text-secondary))`;
  }
  return `color-mix(in oklch, var(--color-viz-2) ${Math.round(Math.abs(t) * 100)}%, var(--color-text-secondary))`;
}

export function WatershedPolygonFormatter({ feature, layer }: InspectFormatterProps) {
  const setPanel = useSetAtom(sidebarPanelAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const name = polygonKey(props) ?? '?';
  const nbs = readNumber(props, 'NbS_Score');
  const restoration = readNumber(props, 'Restoration_Potential');
  const conservation = readNumber(props, 'Conservation_Value');
  const hasData = nbs !== null || restoration !== null || conservation !== null;

  return (
    <article className={styles.card} data-testid="watershed-polygon-formatter">
      <header className={styles.header}>
        <span className={styles.eyebrow}>{layer.title}</span>
        <span className={styles.name}>{String(name)}</span>
      </header>

      {!hasData && (
        <p className={styles.empty} data-testid="watershed-polygon-empty">
          No NbS data joined for this polygon yet.
        </p>
      )}

      {nbs !== null && (
        <div
          className={styles.nbs}
          data-testid="watershed-nbs-value"
          style={{ color: nbsToColor(nbs) }}
        >
          {nbs.toFixed(2)}
          <span className={styles.nbsLabel}>NbS Score</span>
        </div>
      )}

      {conservation !== null && (
        <Bar
          testId="watershed-bar-conservation"
          label="Conservation Value"
          value={conservation}
          accent="var(--color-accent)"
        />
      )}
      {restoration !== null && (
        <Bar
          testId="watershed-bar-restoration"
          label="Restoration Potential"
          value={restoration}
          accent="var(--color-viz-4, #f0c040)"
        />
      )}

      <button
        type="button"
        className={styles.cta}
        onClick={() => {
          const id = polygonKey(props);
          if (id !== null) {
            const ref: SelectedPolygonRef = { layerId: layer.id, featureId: id };
            setSelected(ref);
          }
          setPanel('domain');
        }}
      >
        Open in Watershed analysis →
      </button>
    </article>
  );
}

function Bar({
  testId,
  label,
  value,
  accent,
}: {
  testId: string;
  label: string;
  value: number;
  accent: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={styles.barRow} data-testid={testId}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${clamped * 100}%`, background: accent }}
        />
      </div>
      <span className={styles.barValue}>{(clamped * 100).toFixed(0)}%</span>
    </div>
  );
}
