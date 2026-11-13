'use client';
import { useAtomValue } from 'jotai';
import { coastalEncodingAtom, type CoastalEncodingMode } from '@/atoms';
import styles from './CoastalLegend.module.css';

const TITLE: Record<CoastalEncodingMode, string> = {
  vulnerability: 'Vulnerability Score',
  mangrove: 'Mangrove Coverage',
  'scenario-delta': 'Scenario Delta',
};

interface LegendConfig {
  gradient: string;
  minLabel: string;
  midLabel: string;
  maxLabel: string;
}

const CONFIGS: Record<CoastalEncodingMode, LegendConfig> = {
  vulnerability: {
    gradient: 'linear-gradient(to right, rgb(40, 200, 120), rgb(220, 220, 220), rgb(240, 100, 80))',
    minLabel: '0',
    midLabel: '0.5',
    maxLabel: '1',
  },
  mangrove: {
    gradient: 'linear-gradient(to right, rgb(40, 200, 120), rgb(255, 193, 7))',
    minLabel: 'High',
    midLabel: 'Med',
    maxLabel: 'Low',
  },
  'scenario-delta': {
    gradient: 'linear-gradient(to right, rgb(40, 200, 120), rgb(200, 200, 200), rgb(240, 100, 80))',
    minLabel: '-',
    midLabel: '0',
    maxLabel: '+',
  },
};

export function CoastalLegend() {
  const encoding = useAtomValue(coastalEncodingAtom);
  const config = CONFIGS[encoding];

  return (
    <aside className={styles.legend} aria-label={`Map legend: ${encoding} scale`} data-testid="coastal-legend">
      <header className={styles.title}>{TITLE[encoding]}</header>
      <div
        className={styles.gradientBar}
        data-testid="coastal-legend-gradient"
        style={{ background: config.gradient }}
      />
      <div className={styles.tickRow}>
        <span data-testid="coastal-legend-tick-min">{config.minLabel}</span>
        <span data-testid="coastal-legend-tick-mid">{config.midLabel}</span>
        <span data-testid="coastal-legend-tick-max">{config.maxLabel}</span>
      </div>
    </aside>
  );
}
