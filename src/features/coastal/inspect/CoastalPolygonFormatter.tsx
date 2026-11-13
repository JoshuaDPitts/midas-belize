'use client';
import { useSetAtom } from 'jotai';
import { selectedPolygonAtom, sidebarPanelAtom, type SelectedPolygonRef } from '@/atoms';
import { computeVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';
import type { InspectFormatterProps } from '@/features/_types';
import styles from './CoastalPolygonFormatter.module.css';

function readUrbanRatio(props: Record<string, unknown>): number | null {
  if (typeof props['perc_urban'] === 'number' && Number.isFinite(props['perc_urban'])) {
    return props['perc_urban'] / 100;
  }
  if (typeof props['ratio_urban'] === 'number' && Number.isFinite(props['ratio_urban'])) {
    return props['ratio_urban'];
  }
  return null;
}

function readMangrove(props: Record<string, unknown>): number | null {
  if (
    typeof props['Mangrove_Pct_Total'] === 'number' &&
    Number.isFinite(props['Mangrove_Pct_Total'])
  ) {
    return props['Mangrove_Pct_Total'] / 100;
  }
  return null;
}

function polygonName(props: Record<string, unknown>): string {
  const raw = props['Name'] ?? props['MIMES_ID'] ?? props['id'];
  if (raw !== undefined && raw !== null && raw !== '') return String(raw);
  return 'Polygon';
}

function polygonKey(props: Record<string, unknown>): string | number | null {
  const raw = props['Name'] ?? props['MIMES_ID'] ?? props['id'];
  if (raw === undefined || raw === null || raw === '') return null;
  return raw as string | number;
}

function vulnerabilityColor(score: number): string {
  const t = Math.max(0, Math.min(1, score));
  if (t < 0.33) {
    return `color-mix(in oklch, var(--color-accent) ${Math.round(t * 3 * 100)}%, var(--color-text-secondary))`;
  }
  return `color-mix(in oklch, var(--color-viz-2, #f97316) ${Math.round(t * 100)}%, var(--color-text-secondary))`;
}

export function CoastalPolygonFormatter({ feature, layer }: InspectFormatterProps) {
  const setPanel = useSetAtom(sidebarPanelAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const props = (feature.properties ?? {}) as Record<string, unknown>;

  const name = polygonName(props);
  const urbanRatio = readUrbanRatio(props);
  const mangroveCoverage = readMangrove(props);
  const hasData = urbanRatio !== null || mangroveCoverage !== null;

  const vulnerability =
    hasData
      ? computeVulnerability(urbanRatio ?? 0, mangroveCoverage ?? 0)
      : null;

  return (
    <article className={styles.card} data-testid="coastal-polygon-formatter">
      <header className={styles.header}>
        <span className={styles.eyebrow}>{layer.title}</span>
        <span className={styles.name}>{name}</span>
      </header>

      {!hasData && (
        <p className={styles.empty} data-testid="coastal-polygon-empty">
          No coastal data joined for this polygon yet.
        </p>
      )}

      {vulnerability !== null && (
        <div
          className={styles.vulnScore}
          data-testid="coastal-vulnerability-score"
          style={{ color: vulnerabilityColor(vulnerability) }}
        >
          {vulnerability.toFixed(2)}
          <span className={styles.vulnLabel}>Vulnerability</span>
        </div>
      )}

      {urbanRatio !== null && (
        <Bar
          testId="coastal-bar-urban"
          label="Urban Ratio"
          value={urbanRatio}
          accent="var(--color-viz-3, #f59e0b)"
          ariaLabel={`${name}: ${(Math.max(0, Math.min(1, urbanRatio)) * 100).toFixed(0)}% urban`}
        />
      )}

      {mangroveCoverage !== null && (
        <Bar
          testId="coastal-bar-mangrove"
          label="Mangrove Coverage"
          value={mangroveCoverage}
          accent="var(--color-green, #22c55e)"
          ariaLabel={`${name}: ${(Math.max(0, Math.min(1, mangroveCoverage)) * 100).toFixed(0)}% mangrove coverage`}
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
        Open in Coastal analysis →
      </button>
    </article>
  );
}

function Bar({
  testId,
  label,
  value,
  accent,
  ariaLabel,
}: {
  testId: string;
  label: string;
  value: number;
  accent: string;
  ariaLabel?: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div
      className={styles.barRow}
      data-testid={testId}
      role="meter"
      aria-label={ariaLabel ?? label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
    >
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${clamped * 100}%`, background: accent }}
          aria-hidden="true"
        />
      </div>
      <span className={styles.barValue}>{(clamped * 100).toFixed(0)}%</span>
    </div>
  );
}
