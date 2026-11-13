'use client';
// src/lib/map/core/useSiteNavigation.ts
// ME-011 — fit-to-bounds + site fly-to. Returns imperative helpers that
// call through to MapLibre's `fitBounds` with percentage-based padding
// computed from the live map container size. The `MIN_ZOOM` / `MAX_ZOOM`
// clamp on the map itself takes care of the zoom floor / ceiling
// acceptance criteria — nothing to pass in here.

import { useCallback, useEffect, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { useMapContext } from './MapContext';
import { activeSiteAtom } from '@/atoms';
import { BELIZE_BOUNDS, SITE_BOUNDS, type Bbox, type SiteId } from './constants';

/** Default animation duration for flyTo. Chosen to satisfy the ME-011
 *  acceptance criterion "completing within 1.5 seconds". */
export const FLY_TO_DURATION_MS = 1200;
/** Default bounds-fit animation duration when not flying between sites. */
export const FIT_DURATION_MS = 800;
/** Max fraction of the viewport claimed by padding per side (0.1 = 10%). */
export const DEFAULT_PADDING_RATIO = 0.1;

export interface FitOptions {
  /** Fraction of viewport to reserve as padding per side. Default 0.1. */
  paddingRatio?: number;
  /** Animation duration in ms. Default: FIT_DURATION_MS. */
  duration?: number;
  /** Disable animation entirely (jumpTo). Default: false. */
  animate?: boolean;
}

export interface SiteNavigationApi {
  fitBounds(bbox: Bbox, opts?: FitOptions): void;
  fitBelize(opts?: FitOptions): void;
  flyToSite(siteId: SiteId, opts?: FitOptions): void;
}

export function useSiteNavigation(): SiteNavigationApi {
  const { mapRef } = useMapContext();
  const setActive = useSetAtom(activeSiteAtom);

  const fitBounds = useCallback(
    (bbox: Bbox, opts: FitOptions = {}) => {
      const map = mapRef.current;
      if (!map) return;
      const container = map.getContainer();
      const ratio = opts.paddingRatio ?? DEFAULT_PADDING_RATIO;
      const padding = {
        top:    container.clientHeight * ratio,
        bottom: container.clientHeight * ratio,
        left:   container.clientWidth  * ratio,
        right:  container.clientWidth  * ratio,
      };
      map.fitBounds(bbox, {
        padding,
        duration: opts.duration ?? FIT_DURATION_MS,
        animate: opts.animate !== false,
      });
    },
    [mapRef],
  );

  const fitBelize = useCallback(
    (opts?: FitOptions) => {
      setActive(null);
      fitBounds(BELIZE_BOUNDS, opts);
    },
    [fitBounds, setActive],
  );

  const flyToSite = useCallback(
    (siteId: SiteId, opts: FitOptions = {}) => {
      const bbox = SITE_BOUNDS[siteId];
      if (!bbox) return;
      setActive(siteId);
      fitBounds(bbox, { duration: FLY_TO_DURATION_MS, ...opts });
    },
    [fitBounds, setActive],
  );

  return { fitBounds, fitBelize, flyToSite };
}

// ——— Pure math exposed for tests ———

/** Compute `fitBounds`-compatible padding given a container size + ratio. */
export function computePadding(
  size: { width: number; height: number },
  ratio: number = DEFAULT_PADDING_RATIO,
): { top: number; right: number; bottom: number; left: number } {
  return {
    top:    size.height * ratio,
    bottom: size.height * ratio,
    left:   size.width  * ratio,
    right:  size.width  * ratio,
  };
}

// ——— Auto-fit-on-site-change (BUG A) ———

/**
 * Pure decision for whether the camera should (re-)fit to a site's bounds.
 *
 * Returns the bbox to fit when `active` is a non-null site whose bounds are
 * known, the map is ready, AND `active` differs from `last` (the last site
 * we already fit for). Returns null otherwise — in particular, re-selecting
 * the *same* site or any unrelated re-render (map not ready yet, active
 * site cleared) is a no-op, so a manual pan/zoom after the fit is never
 * yanked back.
 *
 * Exported for unit testing without needing a live MapLibre instance.
 */
export function shouldFitSite(
  last: SiteId | null,
  active: SiteId | null,
  isReady: boolean,
): Bbox | null {
  if (!isReady) return null;
  if (!active) return null;
  if (active === last) return null;
  const bbox = SITE_BOUNDS[active];
  return bbox ?? null;
}

/**
 * Watches `activeSiteAtom` + map readiness and fits the camera to
 * `SITE_BOUNDS[activeSite]` whenever the active site changes (dropdown
 * select, deep-link hydration, or browser back/forward). This is the only
 * writer that reacts to `activeSiteAtom` — `useViewportUrlSync` only reacts
 * to `?v=`/`mapViewportAtom`, so there's no render loop between the two:
 * the fit animation's `moveend` updates `mapViewportAtom`, which in turn
 * updates `?v=` to match the new camera, but neither of those writes touch
 * `activeSiteAtom` again.
 *
 * A stale `?v=` from a deep-link is intentionally overridden: this hook
 * runs once the map is `isReady` (after `MapView` has applied the initial
 * `?v=`-sourced viewport), so the site fit's `fitBounds` call runs *after*
 * and wins, and the resulting camera move is what gets echoed back into
 * `mapViewportAtom`/`?v=`.
 *
 * Render this as a no-render component inside `<MapView>` (e.g. next to
 * `<MapChrome/>` in `MapArea`) so it has map context.
 */
export function useAutoFitActiveSite(): void {
  const { isReady } = useMapContext();
  const { fitBounds } = useSiteNavigation();
  const activeSite = useAtomValue(activeSiteAtom);
  const lastFitRef = useRef<SiteId | null>(null);

  useEffect(() => {
    if (activeSite === null) {
      // Site cleared (e.g. fitBelize()) — forget the last fit so
      // re-selecting the same site later fits again instead of no-op'ing.
      lastFitRef.current = null;
      return;
    }
    const bbox = shouldFitSite(lastFitRef.current, activeSite, isReady);
    if (!bbox) return;
    lastFitRef.current = activeSite;
    fitBounds(bbox, { duration: FLY_TO_DURATION_MS });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSite, isReady]);
}
