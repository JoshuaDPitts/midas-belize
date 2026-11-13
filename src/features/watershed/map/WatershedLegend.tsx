'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom, watershedEncodingAtom, type WatershedEncodingMode } from '@/atoms';
import { CLADES, groupCladesByFamily } from '@/lib/map/core/clades';
import { CladeLegendList } from '@/lib/map/legends/CladeLegendList';
import { useWatershedEbinCladePerPolygon } from './useWatershedEbinCladePerPolygon';
import styles from './WatershedLegend.module.css';

const TITLE: Record<WatershedEncodingMode, string> = {
  nbs: 'NbS Score',
  clade: 'Dominant clade',
  restoration: 'Restoration Potential',
  'erosion-risk': 'Erosion risk',
};

const ALL_CLADE_IDS = CLADES.map((c) => c.id);

export function WatershedLegend() {
  const encoding = useAtomValue(watershedEncodingAtom);
  const site = useAtomValue(activeSiteAtom);
  // Only fetch the clade dataset when clade mode is active; null short-circuits.
  const { lookup } = useWatershedEbinCladePerPolygon(encoding === 'clade' ? site : null);

  if (encoding === 'clade') {
    const present: number[] = [];
    for (const row of lookup.values()) {
      if (row.dominantClade !== null) present.push(row.dominantClade);
    }
    const groups = groupCladesByFamily(present.length > 0 ? present : ALL_CLADE_IDS);
    return (
      <aside className={styles.legend} aria-label="Watershed map color legend" data-testid="watershed-legend">
        <header className={styles.title}>{TITLE.clade}</header>
        <CladeLegendList groups={groups} />
      </aside>
    );
  }

  let gradient: string;
  let minLabel: string;
  let midLabel: string | null;
  let maxLabel: string;

  if (encoding === 'nbs') {
    gradient = 'linear-gradient(to right, rgb(216, 80, 60), rgb(220, 220, 220), rgb(40, 200, 120))';
    minLabel = '-1';
    midLabel = '0';
    maxLabel = '+1';
  } else if (encoding === 'restoration') {
    gradient = 'linear-gradient(to right, rgb(0, 188, 212), rgb(255, 193, 7))';
    minLabel = 'Low';
    midLabel = 'Med';
    maxLabel = 'High';
  } else {
    // erosion-risk
    gradient = 'linear-gradient(to right, rgb(255, 235, 150), rgb(200, 40, 40))';
    minLabel = 'Low';
    midLabel = 'Med';
    maxLabel = 'High';
  }

  return (
    <aside className={styles.legend} aria-label="Watershed map color legend" data-testid="watershed-legend">
      <header className={styles.title}>{TITLE[encoding]}</header>
      <div className={styles.gradientBar} data-testid="watershed-legend-gradient" style={{ background: gradient }} />
      <div className={styles.tickRow}>
        <span data-testid="watershed-legend-min">{minLabel}</span>
        {midLabel !== null && <span>{midLabel}</span>}
        <span data-testid="watershed-legend-max">{maxLabel}</span>
      </div>
    </aside>
  );
}
