'use client';
import { useMemo } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import {
  rfactorMonthAtom,
  manualMonthOverrideAtom,
  type RFactorMonth,
} from '@/atoms';
import styles from './RainfallSeasonality.module.css';

/** Belize national monthly rainfall-erosivity climatology, expressed as
 * the fraction of annual R-factor that falls in each month. Sourced from
 * GloREDa monthly R-factor (Panagos et al. 2023, JRC ESDAC). The 12
 * values sum to ~1.0. Drives the relative magnitude bars in the
 * seasonality grid; replace with a per-site hook once the zonal monthly
 * R-factor join lands per watershed polygon. */
export const BELIZE_MONTHLY_R_FRACTION: number[] = [
  0.025, // Jan
  0.018, // Feb
  0.024, // Mar
  0.034, // Apr
  0.071, // May
  0.135, // Jun
  0.142, // Jul
  0.133, // Aug
  0.161, // Sep — peak
  0.130, // Oct
  0.080, // Nov
  0.047, // Dec
];

const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export interface PeakMonthSummary {
  peakIdx: number; // 0..11
  peakLabel: string;
  peakRatio: number; // value × annual mean
}

export function summarisePeakMonth(fractions: number[]): PeakMonthSummary {
  let peakIdx = 0;
  let peakValue = -Infinity;
  for (let i = 0; i < fractions.length; i++) {
    if (fractions[i] > peakValue) {
      peakValue = fractions[i];
      peakIdx = i;
    }
  }
  const annualMean = 1 / fractions.length;
  return {
    peakIdx,
    peakLabel: MONTH_LABELS[peakIdx] ?? `M${peakIdx + 1}`,
    peakRatio: annualMean > 0 ? peakValue / annualMean : 0,
  };
}

export function RainfallSeasonality() {
  const [month, setMonth] = useAtom(rfactorMonthAtom);
  const setManualOverride = useSetAtom(manualMonthOverrideAtom);
  const peak = useMemo(() => summarisePeakMonth(BELIZE_MONTHLY_R_FRACTION), []);
  const maxFraction = useMemo(() => Math.max(...BELIZE_MONTHLY_R_FRACTION), []);

  const pickMonth = (idx: number) => {
    const next = (idx + 1) as RFactorMonth;
    setMonth(next);
    setManualOverride(true);
  };

  const resumeTimeline = () => {
    setMonth(null);
    setManualOverride(false);
  };

  return (
    <section
      className={styles.section}
      data-testid="rainfall-seasonality"
      aria-label="Monthly rainfall erosivity (R-factor)"
    >
      <header className={styles.header}>
        <span className={styles.eyebrow}>Rainfall erosivity, monthly</span>
        <span className={styles.peak} data-testid="rainfall-peak-caption">
          Peak month: <strong>{peak.peakLabel}</strong> · {peak.peakRatio.toFixed(1)}× annual mean
        </span>
      </header>
      <p className={styles.note}>
        R-factor estimates how strongly rainfall can detach soil. This is a Belize-wide seasonal pattern, so every watershed shares the same monthly curve until per-watershed monthly R is joined.
      </p>
      <div className={styles.grid} role="radiogroup" aria-label="Pick month">
        {BELIZE_MONTHLY_R_FRACTION.map((fraction, i) => {
          const label = MONTH_LABELS[i];
          const isActive = month === ((i + 1) as RFactorMonth);
          const isPeak = i === peak.peakIdx;
          const pct = Math.max(2, (fraction / maxFraction) * 100);
          return (
            <button
              key={label}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-testid={`rainfall-month-${label.toLowerCase()}`}
              className={`${styles.tile} ${isActive ? styles.tileActive : ''} ${isPeak ? styles.tilePeak : ''}`}
              onClick={() => pickMonth(i)}
            >
              <span className={styles.tileLabel}>{label}</span>
              <span className={styles.tileBarTrack}>
                <span
                  className={styles.tileBar}
                  style={{ height: `${pct}%` }}
                  aria-hidden
                />
              </span>
              <span className={styles.tileValue}>{(fraction * 100).toFixed(0)}%</span>
            </button>
          );
        })}
      </div>
      {month !== null && (
        <footer className={styles.footer}>
          <button
            type="button"
            className={styles.resumeButton}
            data-testid="rainfall-resume-timeline"
            onClick={resumeTimeline}
          >
            Resume timeline (clear pick)
          </button>
        </footer>
      )}
    </section>
  );
}
