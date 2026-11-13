'use client';
import { useMemo } from 'react';
import styles from './DeltaSparkline.module.css';

export interface DeltaSparklineProps {
  baseSeries: readonly number[];
  scenarioSeries: readonly number[];
  timeAxisLabels?: readonly string[];
  width?: number;
  height?: number;
  baseColor?: string;
  scenarioColor?: string;
  ariaLabel?: string;
}

/**
 * REQ-SC-021: DeltaSparkline
 * 
 * Pure SVG primitive for visualizing scenario deltas over time.
 * Renders two polylines (base dashed, scenario solid) normalized to shared y-axis.
 * Shows placeholder bar when series are empty.
 */
export function DeltaSparkline({
  baseSeries,
  scenarioSeries,
  timeAxisLabels,
  width = 200,
  height = 40,
  baseColor = 'var(--neutral-500)',
  scenarioColor,
  ariaLabel = 'Scenario comparison sparkline',
}: DeltaSparklineProps) {
  const isEmpty = baseSeries.length === 0 && scenarioSeries.length === 0;

  // Compute polyline points
  const { basePoints, scenarioPoints } = useMemo(() => {
    if (isEmpty) return { basePoints: '', scenarioPoints: '' };

    // Find min/max across both series for shared y-axis
    const allValues = [...baseSeries, ...scenarioSeries];
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const range = max - min;

    // Padding
    const padding = { top: 4, right: 4, bottom: 4, left: 4 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Helper to normalize value to y coordinate
    const normalizeY = (value: number) => {
      if (range === 0) return chartHeight / 2 + padding.top;
      const normalized = (value - min) / range;
      // Flip y-axis (SVG y=0 is at top)
      return chartHeight - normalized * chartHeight + padding.top;
    };

    // Helper to compute x coordinate
    const getX = (index: number, seriesLength: number) => {
      if (seriesLength <= 1) return chartWidth / 2 + padding.left;
      return (index / (seriesLength - 1)) * chartWidth + padding.left;
    };

    // Build base series points
    const basePointsArray = baseSeries.map((value, i) => {
      const x = getX(i, baseSeries.length);
      const y = normalizeY(value);
      return `${x},${y}`;
    });

    // Build scenario series points
    const scenarioPointsArray = scenarioSeries.map((value, i) => {
      const x = getX(i, scenarioSeries.length);
      const y = normalizeY(value);
      return `${x},${y}`;
    });

    return {
      basePoints: basePointsArray.join(' '),
      scenarioPoints: scenarioPointsArray.join(' '),
    };
  }, [baseSeries, scenarioSeries, width, height, isEmpty]);

  // Determine scenario color based on delta sign if not provided
  const computedScenarioColor = useMemo(() => {
    if (scenarioColor) return scenarioColor;
    if (isEmpty) return 'var(--neutral-400)';

    // Simple heuristic: compare last values
    const baseEnd = baseSeries[baseSeries.length - 1] ?? 0;
    const scenarioEnd = scenarioSeries[scenarioSeries.length - 1] ?? 0;
    const delta = scenarioEnd - baseEnd;

    // Green for improvement (positive delta), coral for degradation (negative)
    return delta >= 0 ? 'var(--success)' : 'var(--warning)';
  }, [scenarioColor, baseSeries, scenarioSeries, isEmpty]);

  return (
    <svg
      width={width}
      height={height}
      className={styles.sparkline}
      role="img"
      aria-label={ariaLabel}
    >
      {isEmpty ? (
        // Empty state: placeholder bar
        <rect
          x="0"
          y={height / 2 - 2}
          width={width}
          height="4"
          fill="var(--neutral-300)"
          opacity="0.4"
        />
      ) : (
        <>
          {/* Base series: dashed */}
          <polyline
            points={basePoints}
            fill="none"
            stroke={baseColor}
            strokeWidth="1.5"
            strokeDasharray="3 2"
          />
          {/* Scenario series: solid */}
          <polyline
            points={scenarioPoints}
            fill="none"
            stroke={computedScenarioColor}
            strokeWidth="2"
          />
        </>
      )}
    </svg>
  );
}
