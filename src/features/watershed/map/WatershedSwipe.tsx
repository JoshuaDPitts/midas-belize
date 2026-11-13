'use client';
import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  activeSiteAtom,
  swipeWatershedAtom,
} from '@/atoms';
import { useWatershedsForSite } from '@/lib/data';
import { polygonKeyOf } from '../data/findWatershedFeature';
import styles from './WatershedSwipe.module.css';

/** Watershed compare controls. The original WS-031 plan called this a
 * "swipe" primitive, but no layer clipping shipped, so the visible handle
 * felt broken. This component now owns honest compare controls; map highlights
 * are rendered by WatershedMapLayers from the same swipeWatershedAtom state. */
export function WatershedSwipe() {
  const site = useAtomValue(activeSiteAtom);
  const [swipe, setSwipe] = useAtom(swipeWatershedAtom);
  const { geometry } = useWatershedsForSite(site);

  const active = swipe.left !== null || swipe.right !== null;

  const watershedOptions = useMemo(() => {
    if (!geometry) return [] as { id: string; label: string }[];
    return geometry.features
      .map((f) => {
        const props = (f.properties ?? {}) as Record<string, unknown>;
        const key = polygonKeyOf(props);
        if (key === null) return null;
        return { id: String(key), label: String(key) };
      })
      .filter((x): x is { id: string; label: string } => x !== null);
  }, [geometry]);

  if (!active) return null;

  const closeSwipe = () => {
    setSwipe({ left: null, right: null });
  };

  return (
    <div
      data-testid="watershed-swipe-root"
      className={styles.root}
    >
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <div className={styles.title}>Compare watersheds</div>
            <div className={styles.subtitle}>Map outlines show the two selected watersheds.</div>
          </div>
          <button
            type="button"
            data-testid="watershed-swipe-close"
            className={styles.closeButton}
            onClick={closeSwipe}
            aria-label="Close compare"
          >
            ×
          </button>
        </div>
        <label className={styles.selectLabel}>
          <span>Primary</span>
          <select
            data-testid="watershed-swipe-left-select"
            className={styles.select}
            value={swipe.left === null ? '' : String(swipe.left)}
            onChange={(e) =>
              setSwipe({ ...swipe, left: e.target.value === '' ? null : e.target.value })
            }
          >
            <option value="">Pick primary watershed</option>
            {watershedOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.selectLabel}>
          <span>Compare with</span>
          <select
            data-testid="watershed-swipe-right-select"
            className={styles.select}
            value={swipe.right === null ? '' : String(swipe.right)}
            onChange={(e) =>
              setSwipe({ ...swipe, right: e.target.value === '' ? null : e.target.value })
            }
          >
            <option value="">Pick second watershed</option>
            {watershedOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className={styles.legend} aria-hidden>
          <span className={styles.legendLeft} /> Primary
          <span className={styles.legendRight} /> Compare
        </div>
      </div>
    </div>
  );
}
