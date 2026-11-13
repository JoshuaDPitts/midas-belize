'use client';
import { useSetAtom } from 'jotai';
import { sidebarPanelAtom } from '@/atoms';
import type { InspectFormatterProps } from '@/features/_types';
import styles from './MarinePolygonFormatter.module.css';

function readNumber(props: Record<string, unknown>, key: string): number | null {
  const v = props[key];
  return typeof v === 'number' ? v : null;
}

function nbsToColor(score: number): string {
  const t = Math.min(1, Math.max(0, score));
  return `color-mix(in oklch, var(--color-accent) ${Math.round(t * 100)}%, var(--color-text-secondary))`;
}

export function MarinePolygonFormatter({ feature, layer }: InspectFormatterProps) {
  const setPanel = useSetAtom(sidebarPanelAtom);
  const props = feature.properties as Record<string, unknown>;
  const polygonId = props.MIMES_ID ?? props.id ?? props.ID ?? props.GRID_ID ?? props.Name ?? '?';
  const nbs = readNumber(props, 'NbS_Score');
  const restoration = readNumber(props, 'Restoration_Potential');
  const conservation = readNumber(props, 'Conservation_Value');

  return (
    <article className={styles.card}>
      <header data-testid="marine-polygon-header" className={styles.header}>
        {layer.title} · polygon {String(polygonId)}
      </header>

      {nbs !== null && (
        <div data-testid="marine-polygon-nbs" className={styles.nbs} style={{ color: nbsToColor(nbs) }}>
          {nbs.toFixed(2)}
          <span className={styles.nbsLabel}>NbS Score</span>
        </div>
      )}

      {restoration !== null && conservation !== null && (
        <dl className={styles.dl}>
          <dt>Restoration Potential</dt>
          <dd>{(restoration * 100).toFixed(0)}%</dd>
          <dt>Conservation Value</dt>
          <dd>{(conservation * 100).toFixed(0)}%</dd>
        </dl>
      )}

      <button
        type="button"
        className={styles.cta}
        onClick={() => setPanel('domain')}
        aria-label="Open in Marine analysis"
      >
        Open in Marine analysis →
      </button>
    </article>
  );
}
