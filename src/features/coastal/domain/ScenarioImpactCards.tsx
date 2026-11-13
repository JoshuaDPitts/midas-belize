'use client';
import { useAtomValue } from 'jotai';
import {
  activeScenarioAtom,
  coastalResolutionAtom,
  selectedPolygonAtom,
} from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { useCoastalScenarioImpact } from '@/lib/data/hooks/useCoastalScenarioImpact';
import styles from './ScenarioImpactCards.module.css';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface ScenarioImpactCardsProps {
  site: SiteId | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute aggregate (mean) delta across all polygon values in the map. */
function aggregateDelta(deltas: Map<string, number>): number | null {
  if (deltas.size === 0) return null;
  let sum = 0;
  for (const v of deltas.values()) sum += v;
  return sum / deltas.size;
}

/** Format a delta value for display. */
function formatDelta(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return '—';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(2)}`;
}

/** Determine direction: negative = improvement, positive = degradation, zero = neutral. */
function deltaDirection(delta: number | null): 'improvement' | 'degradation' | 'neutral' {
  if (delta === null) return 'neutral';
  if (delta < 0) return 'improvement';
  if (delta > 0) return 'degradation';
  return 'neutral';
}

// ---------------------------------------------------------------------------
// Sub-component: single metric card
// ---------------------------------------------------------------------------
interface MetricCardProps {
  testId: string;
  label: string;
  delta: number | null;
  polygonId?: string | null;
}

function MetricCard({ testId, label, delta, polygonId }: MetricCardProps) {
  const direction = deltaDirection(delta);
  const display = formatDelta(delta);

  return (
    <div className={styles.card} data-testid={testId}>
      <div className={styles.cardLabel}>{label}</div>
      {polygonId && (
        <div className={styles.polygonBadge}>{polygonId}</div>
      )}
      <div
        className={styles.delta}
        data-direction={direction}
        aria-label={`${label} delta: ${display}, ${direction}`}
      >
        {display}
      </div>
      <div className={styles.directionLabel}>
        {direction === 'improvement' && 'Improvement'}
        {direction === 'degradation' && 'Degradation'}
        {direction === 'neutral' && 'No change'}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function ScenarioImpactCards({ site }: ScenarioImpactCardsProps) {
  const scenarioId = useAtomValue(activeScenarioAtom);
  const resolution = useAtomValue(coastalResolutionAtom);
  const selectedPolygon = useAtomValue(selectedPolygonAtom);

  const { waveDeltas, erosionDeltas, servicesDeltas, loading } =
    useCoastalScenarioImpact(scenarioId, site, resolution);

  // No scenario selected
  if (scenarioId === null) {
    return (
      <div className={styles.root} data-testid="impact-cards-placeholder">
        <p className={styles.placeholderText}>
          Select a scenario to compare against the Base Case.
        </p>
      </div>
    );
  }

  const polygonId = selectedPolygon
    ? String(selectedPolygon.featureId)
    : null;

  // Compute deltas — per-polygon or site aggregate
  const waveDelta = polygonId
    ? (waveDeltas.get(polygonId) ?? null)
    : aggregateDelta(waveDeltas);

  const erosionDelta = polygonId
    ? (erosionDeltas.get(polygonId) ?? null)
    : aggregateDelta(erosionDeltas);

  const servicesDelta = polygonId
    ? (servicesDeltas.get(polygonId) ?? null)
    : aggregateDelta(servicesDeltas);

  return (
    <div className={styles.root} data-testid="impact-cards-root">
      {/* Aggregate / polygon label */}
      {polygonId ? (
        <div className={styles.contextLabel} data-testid="impact-cards-polygon-label">
          Showing deltas for polygon <strong>{polygonId}</strong>
        </div>
      ) : (
        <div className={styles.contextLabel} data-testid="impact-cards-aggregate-label">
          Site average across all polygons
        </div>
      )}

      {loading && (
        <div className={styles.loading} aria-live="polite">
          Loading…
        </div>
      )}

      {!loading && (
        <div className={styles.cards}>
          <MetricCard
            testId="impact-card-wave"
            label="Wave Attenuation"
            delta={waveDelta}
            polygonId={polygonId}
          />
          <MetricCard
            testId="impact-card-erosion"
            label="Erosion Rate"
            delta={erosionDelta}
            polygonId={polygonId}
          />
          <MetricCard
            testId="impact-card-services"
            label="Ecosystem Services"
            delta={servicesDelta}
            polygonId={polygonId}
          />
        </div>
      )}
    </div>
  );
}
