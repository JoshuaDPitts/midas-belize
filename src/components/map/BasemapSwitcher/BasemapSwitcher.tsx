'use client';
import { useAtom } from 'jotai';
import { basemapAtom } from '@/atoms';
import { BASEMAPS, type BasemapId } from '@/lib/map/core/styles';
import styles from './BasemapSwitcher.module.css';

export function BasemapSwitcher() {
  const [active, setActive] = useAtom(basemapAtom);
  const ids = Object.keys(BASEMAPS) as BasemapId[];
  return (
    <div className={styles.switcher} role="radiogroup" aria-label="Basemap style">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={active === id}
          className={active === id ? styles.active : styles.item}
          onClick={() => setActive(id)}
        >
          {BASEMAPS[id].label}
        </button>
      ))}
    </div>
  );
}
