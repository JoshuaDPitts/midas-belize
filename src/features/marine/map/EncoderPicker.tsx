'use client';
import { useAtom, useAtomValue } from 'jotai';
import { activeSiteAtom, marineEncodingAtom, type MarineEncodingMode } from '@/atoms';
import styles from './EncoderPicker.module.css';

interface PillSpec {
  mode: MarineEncodingMode;
  label: string;
  title: string;
}

const BASE_PILLS: PillSpec[] = [
  { mode: 'nbs', label: 'NbS', title: 'Color polygons by their Nature-based Solutions score (Restoration Potential + Conservation Value).' },
  { mode: 'clade', label: 'Clade', title: 'Color polygons by their dominant ecosystem clade (highest Clade_N_pct).' },
  { mode: 'restoration', label: 'Restoration', title: 'Color polygons by Restoration Potential alone: where could mangroves be restored?' },
];

const BIOMASS_PILL: PillSpec = {
  mode: 'biomass',
  label: 'Biomass',
  title: 'Color polygons by coral biomass (Laughing Bird Caye only).',
};

export function EncoderPicker() {
  const [encoding, setEncoding] = useAtom(marineEncodingAtom);
  const activeSite = useAtomValue(activeSiteAtom);
  // Biomass only has matching data on Laughing Bird (polygon_id 1..43); on
  // every other site it renders as a meaningless grey fallback, so the pill
  // is only offered there.
  const PILLS: PillSpec[] = activeSite === 'laughing-bird' ? [...BASE_PILLS, BIOMASS_PILL] : BASE_PILLS;

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const idx = PILLS.findIndex((p) => p.mode === encoding);
    const delta = e.key === 'ArrowRight' ? 1 : -1;
    const nextIdx = (idx + delta + PILLS.length) % PILLS.length;
    setEncoding(PILLS[nextIdx].mode);
    e.preventDefault();
  }

  return (
    <div
      role="radiogroup"
      aria-label="Map color encoding"
      className={styles.picker}
      onKeyDown={onKeyDown}
    >
      {PILLS.map((p) => (
        <button
          key={p.mode}
          role="radio"
          type="button"
          aria-checked={encoding === p.mode}
          title={p.title}
          className={`${styles.pill} ${encoding === p.mode ? styles.pillActive : ''}`}
          onClick={() => setEncoding(p.mode)}
          tabIndex={encoding === p.mode ? 0 : -1}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
