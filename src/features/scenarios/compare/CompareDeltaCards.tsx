'use client';
import type { SiteId } from '@/lib/data/types';
import type { ScenarioId } from '../matrix';
import { useScenarioComparison } from '../data/useScenarioComparison';
import { DeltaSparkline } from './DeltaSparkline';
import styles from './CompareDeltaCards.module.css';

export interface CompareDeltaCardsProps {
  site: SiteId | null;
  vertical: 'coastal' | 'watershed' | 'marine';
  scenarioA: ScenarioId | null;
  scenarioB: ScenarioId | null;
  polygonId?: string;
}

// Vertical-specific metric vocabularies
const VERTICAL_METRICS = {
  coastal: ['wave-attenuation', 'erosion-rate', 'mangrove-area', 'ecosys-services'] as const,
  watershed: ['sediment-yield', 'nbs-score', 'mangrove-area'] as const,
  marine: [] as const, // no metrics in v1
};

const METRIC_LABELS: Record<string, string> = {
  'wave-attenuation': 'Wave attenuation',
  'erosion-rate': 'Erosion rate',
  'mangrove-area': 'Mangrove area',
  'ecosys-services': 'Ecosystem services',
  'sediment-yield': 'Sediment yield',
  'nbs-score': 'NbS score',
};

/**
 * REQ-SC-022: CompareDeltaCards
 * 
 * Renders Shape D grid — one card per metric for the active vertical.
 * Each card shows:
 * - Metric name + signed delta badge
 * - DeltaSparkline showing base vs scenario over time
 * - Endpoint values below
 */
export function CompareDeltaCards({
  site,
  vertical,
  scenarioA,
  scenarioB,
  polygonId,
}: CompareDeltaCardsProps) {
  const comparison = useScenarioComparison({
    site,
    vertical,
    scenarioA,
    scenarioB,
  });

  // Empty state when no data available
  if (!comparison.availability.aHasData || !comparison.availability.bHasData) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyMessage}>
          No comparable {vertical} data for {scenarioA ?? 'null'} vs {scenarioB ?? 'null'}.
        </p>
        <p className={styles.emptyHint}>
          Try a different scenario pair or switch verticals.
        </p>
      </div>
    );
  }

  const metrics = VERTICAL_METRICS[vertical];

  return (
    <div className={styles.grid}>
      {metrics.map((metricId) => {
        const delta = comparison.deltas.get(metricId);
        const timeSeries = comparison.timeSeries.get(metricId);

        // Get delta value (polygon-specific or site aggregate)
        const deltaValue = polygonId
          ? delta?.polygonById.get(polygonId) ?? 0
          : delta?.siteAggregate ?? 0;

        // Format delta as percentage
        const deltaPercent = (deltaValue * 100).toFixed(0);
        const deltaSign = deltaValue >= 0 ? '+' : '−';
        const deltaAbs = Math.abs(parseFloat(deltaPercent));

        // Determine badge class based on sign
        // Negative delta = improvement (green), positive = degradation (coral)
        const badgeClass = deltaValue < 0 ? styles.improvement : styles.degradation;

        return (
          <div key={metricId} className={styles.card}>
            {/* Header: metric name + delta badge */}
            <div className={styles.header}>
              <h3 className={styles.metricName}>{METRIC_LABELS[metricId]}</h3>
              <span className={`${styles.badge} ${badgeClass}`}>
                {deltaSign}{deltaAbs}%
              </span>
            </div>

            {/* Sparkline */}
            <div className={styles.sparklineContainer}>
              <DeltaSparkline
                baseSeries={timeSeries?.tA ?? []}
                scenarioSeries={timeSeries?.tB ?? []}
                timeAxisLabels={timeSeries?.timeAxis}
                width={280}
                height={50}
                ariaLabel={`${METRIC_LABELS[metricId]} over time sparkline`}
              />
            </div>

            {/* Endpoint values */}
            {timeSeries && timeSeries.tA.length > 0 && timeSeries.tB.length > 0 && (
              <div className={styles.endpoints}>
                <span className={styles.endpointBase}>
                  Base: {timeSeries.tA[timeSeries.tA.length - 1]?.toFixed(2)}
                </span>
                <span className={styles.endpointArrow}>→</span>
                <span className={styles.endpointScenario}>
                  {scenarioB}: {timeSeries.tB[timeSeries.tB.length - 1]?.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
