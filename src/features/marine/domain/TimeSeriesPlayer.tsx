'use client';
import { useState } from 'react';
import { useAtomValue } from 'jotai';
import { timeStepAtom, timeRangeAtom } from '@/atoms/index';
import { FormulaTooltip } from '@/components/ui/FormulaTooltip';
import styles from './TimeSeriesPlayer.module.css';

export interface TimeSeriesPoint {
  iso: string;
  value: number;
}

export interface TimeSeries {
  id: string;
  label: string;
  unit: string;
  formula: string;
  explanation: string;
  points: TimeSeriesPoint[];
}

interface TimeSeriesPlayerProps {
  series: TimeSeries[];
}

const VIEW_W = 320;
const VIEW_H = 100;
const PAD = 12;

function pointsToPolyline(points: TimeSeriesPoint[], min: number, max: number): string {
  if (points.length === 0) return '';
  const span = max - min || 1;
  const dx = (VIEW_W - 2 * PAD) / Math.max(points.length - 1, 1);
  return points
    .map((p, i) => {
      const x = PAD + i * dx;
      const y = VIEW_H - PAD - ((p.value - min) / span) * (VIEW_H - 2 * PAD);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function TimeSeriesPlayer({ series }: TimeSeriesPlayerProps) {
  const step = useAtomValue(timeStepAtom);
  const range = useAtomValue(timeRangeAtom);
  const currentIso = range[step] ?? null;
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  function toggleSeries(id: string) {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (series.length === 0) {
    return <div className={styles.empty}>No time series for the active selection.</div>;
  }

  return (
    <section className={styles.section}>
      <header className={styles.header}>
        <span>Time series</span>
      </header>

      <ul className={styles.chips}>
        {series.map((s) => {
          const value =
            currentIso ? s.points.find((p) => p.iso === currentIso)?.value ?? null : null;
          const hidden = hiddenSeries.has(s.id);
          return (
            <li key={s.id} className={styles.chipRow}>
              <button
                data-testid={`series-chip-${s.id}`}
                aria-pressed={!hidden}
                className={`${styles.chip} ${hidden ? styles.chipHidden : ''}`}
                onClick={() => toggleSeries(s.id)}
              >
                <span className={styles.chipLabel}>{s.label}</span>
                <span data-testid={`playhead-value-${s.id}`} className={styles.chipValue}>
                  {value !== null ? value.toFixed(1) : '—'} {s.unit}
                </span>
              </button>
              <FormulaTooltip label={s.label} formula={s.formula} explanation={s.explanation} />
            </li>
          );
        })}
      </ul>

      {series.every((s) => s.points.length === 0) ? (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="No time-series data available"
          data-testid="timeseries-empty-chart"
        >
          <line
            x1={PAD}
            y1={VIEW_H / 2}
            x2={VIEW_W - PAD}
            y2={VIEW_H / 2}
            className={styles.svgEmptyLine}
          />
          <text
            x={VIEW_W / 2}
            y={VIEW_H / 2 - 12}
            className={styles.svgEmptyText}
          >
            Awaiting time-series data
          </text>
        </svg>
      ) : (
        <svg
          className={styles.svg}
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="Time series"
        >
          {series.map((s) => {
            const values = s.points.map((p) => p.value);
            const min = Math.min(...values);
            const max = Math.max(...values);
            const hidden = hiddenSeries.has(s.id);
            return (
              <polyline
                key={s.id}
                points={pointsToPolyline(s.points, min, max)}
                className={styles.line}
                style={{
                  opacity: hidden ? 0 : 1,
                  transition: 'opacity 300ms var(--ease-out)',
                  pointerEvents: hidden ? 'none' : 'auto',
                }}
              />
            );
          })}
          {currentIso && range.length > 1 && (
            <line
              x1={PAD + (step / Math.max(range.length - 1, 1)) * (VIEW_W - 2 * PAD)}
              x2={PAD + (step / Math.max(range.length - 1, 1)) * (VIEW_W - 2 * PAD)}
              y1={PAD}
              y2={VIEW_H - PAD}
              className={styles.playhead}
            />
          )}
        </svg>
      )}
    </section>
  );
}
