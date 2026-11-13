'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import { useLayersForSite } from '@/lib/data';
import styles from './MarineLayerGroups.module.css';

const PLACENCIA_LAYER_IDS = new Set([
  'placencia-marine-polygons',
  'placencia-coast-polygons',
  'placencia-30polygons-shape',
  'placencia-marine-ebin-clade-detail',
  'placencia-marine-nbs-scores',
  'placencia-coast-ebin-clade-detail',
  'placencia-coast-nbs-scores',
  'placencia-30polygons-ebin-clade-detail',
  'placencia-30polygons-nbs-scores',
  'placencia-mimes-ebin-clade-detail',
  'placencia-mimes-nbs-scores',
]);

const CAYECAULKER_LAYER_IDS = new Set([
  'cayecaulker-marine-polygons',
  'cayecaulker-coast-polygons',
  'cayecaulker-site',
  'cayecaulker-marine-ebin-clade-detail',
  'cayecaulker-marine-nbs-scores',
  'cayecaulker-coast-ebin-clade-detail',
  'cayecaulker-coast-nbs-scores',
  'cayecaulker-mimes-ebin-clade-detail',
  'cayecaulker-mimes-nbs-scores',
]);

const BELIZE_WIDE_LAYER_IDS = new Set(['sst-monthly-2015-2024']);

export function MarineLayerGroups() {
  const activeSite = useAtomValue(activeSiteAtom);
  const { layers } = useLayersForSite(activeSite);

  let title: string;
  let allowedIds: Set<string>;
  if (activeSite === 'placencia') {
    title = 'Marine model — Placencia';
    allowedIds = PLACENCIA_LAYER_IDS;
  } else if (activeSite === 'caye-caulker') {
    title = 'Marine model — Caye Caulker';
    allowedIds = CAYECAULKER_LAYER_IDS;
  } else {
    title = 'Marine — Belize-wide';
    allowedIds = BELIZE_WIDE_LAYER_IDS;
  }

  const filtered = layers.filter((l) => allowedIds.has(l.id));
  if (filtered.length === 0) return null;

  return (
    <section data-testid="marine-layers-group" className={styles.group}>
      <h3 className={styles.title}>{title}</h3>
      <ul className={styles.list}>
        {filtered.map((l) => (
          <li key={l.id} className={styles.item}>
            {l.title}
          </li>
        ))}
      </ul>
    </section>
  );
}
