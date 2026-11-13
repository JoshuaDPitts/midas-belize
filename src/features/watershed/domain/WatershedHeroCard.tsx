'use client';
import { useMemo } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  activeSiteAtom,
  selectedPolygonAtom,
  swipeWatershedAtom,
  sidebarPanelAtom,
} from '@/atoms';
import { useWatershedsForSite } from '@/lib/data';
import { WatershedThumbnail } from './WatershedThumbnail';
import { nbsEncoder } from '../map/encoders';
import { findWatershedFeature, polygonKeyOf } from '../data/findWatershedFeature';
import styles from './WatershedHeroCard.module.css';

function rgbaToCss(rgba: [number, number, number, number]): string {
  return `rgba(${rgba[0]}, ${rgba[1]}, ${rgba[2]}, ${(rgba[3] / 255).toFixed(2)})`;
}

function scrollToFormula() {
  if (typeof document === 'undefined') return;
  const target = document.getElementById('watershed-rusle-card');
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function WatershedHeroCard() {
  const site = useAtomValue(activeSiteAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const setSwipe = useSetAtom(swipeWatershedAtom);
  const setPanel = useSetAtom(sidebarPanelAtom);
  const { geometry, joinedAttrs } = useWatershedsForSite(site);

  const feature = useMemo(() => {
    if (!selected) return null;
    return findWatershedFeature(
      geometry,
      [joinedAttrs?.nbs, joinedAttrs?.rusle],
      selected.featureId,
    );
  }, [geometry, joinedAttrs, selected]);

  if (!selected || !feature) return null;

  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const name = String(polygonKeyOf(props) ?? '?');
  const mimesId = props.MIMES_ID;
  const nbs = typeof props.NbS_Score === 'number' ? props.NbS_Score : null;
  const conservation =
    typeof props.Conservation_Value === 'number' ? props.Conservation_Value : null;
  const restoration =
    typeof props.Restoration_Potential === 'number' ? props.Restoration_Potential : null;

  const encoderColor = rgbaToCss(nbsEncoder(props));

  return (
    <article className={styles.card} data-testid="watershed-hero-card">
      <div className={styles.accentRail} aria-hidden />
      <header className={styles.header}>
        <WatershedThumbnail
          feature={feature}
          size={120}
          encoderColor={encoderColor}
          active
          className={styles.thumb}
        />
        <div className={styles.identity}>
          <h2 className={styles.name}>{name}</h2>
          {mimesId !== undefined && mimesId !== null && (
            <span className={styles.mimesId}>MIMES_ID · #{String(mimesId)}</span>
          )}
          <div className={styles.actions} role="group" aria-label="Watershed actions">
            <button
              type="button"
              className={styles.pill}
              title="Opens the map compare controls. Pick a second watershed from the right selector."
              onClick={() => {
                if (selected.featureId !== null) {
                  setSwipe((prev) => ({ ...prev, left: selected.featureId }));
                }
              }}
            >
              Compare to…
            </button>
            <button
              type="button"
              className={styles.pill}
              title="Opens the Scenarios section. Scenario outputs are shown when published for this site."
              onClick={() => {
                setPanel('domain');
                const t = document.getElementById('watershed-scenarios');
                if (t && 'open' in t) (t as HTMLDetailsElement).open = true;
                t?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                t?.querySelector<HTMLElement>('summary, button, [tabindex]')?.focus();
              }}
            >
              View scenarios
            </button>
            <button
              type="button"
              className={styles.pill}
              onClick={scrollToFormula}
            >
              Show formula
            </button>
          </div>
        </div>
      </header>

      <div className={styles.metrics}>
        {nbs !== null && (
          <div className={styles.nbsBlock}>
            <span className={styles.nbsValue} data-testid="watershed-hero-nbs">
              {nbs.toFixed(2)}
            </span>
            <span className={styles.nbsLabel}>NbS Score</span>
          </div>
        )}
        {conservation !== null && (
          <Bar
            testId="watershed-hero-bar-conservation"
            label="Conservation"
            value={conservation}
            accent="var(--color-accent)"
          />
        )}
        {restoration !== null && (
          <Bar
            testId="watershed-hero-bar-restoration"
            label="Restoration"
            value={restoration}
            accent="var(--color-accent-warm)"
          />
        )}
      </div>
    </article>
  );
}

function Bar({
  testId,
  label,
  value,
  accent,
}: {
  testId: string;
  label: string;
  value: number;
  accent: string;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <div className={styles.barRow} data-testid={testId}>
      <span className={styles.barLabel}>{label}</span>
      <div className={styles.barTrack}>
        <div
          className={styles.barFill}
          style={{ width: `${clamped * 100}%`, background: accent }}
        />
      </div>
      <span className={styles.barValue}>{(clamped * 100).toFixed(0)}%</span>
    </div>
  );
}
