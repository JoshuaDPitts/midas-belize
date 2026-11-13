'use client';
import { useEffect, useRef } from 'react';
import { useAtom } from 'jotai';
import { useQueryState } from 'nuqs';
import {
  activeSiteAtom,
  activeScenarioAtom,
  timeStepAtom,
  timeRangeAtom,
  visibleLayersAtom,
  mapViewportAtom,
  sidebarPanelAtom,
  selectedPolygonAtom,
  compareScenarioBAtom,
  compareVerticalAtom,
  compareLayoutModeAtom,
  type MapViewport,
  type SelectedPolygonRef,
} from '@/atoms';
import {
  siteParser,
  scenarioParser,
  tParser,
  layersParser,
  viewportParser,
  panelParser,
  polygonParser,
  compareScenarioAParser,
  compareScenarioBParser,
  compareVerticalParser,
  compareLayoutModeParser,
} from '@/atoms/url-parsers';

/**
 * Bidirectional mirror between activeSiteAtom and ?site=. Site changes use
 * pushState so the browser back button maps to the previous site selection.
 *
 * Loop avoidance: same one-shot ignore-flag pattern as useSidebarPanelUrlSync —
 * each direction sets a flag for the OPPOSITE side BEFORE writing, so when
 * the echo arrives, the receiver consumes the flag and skips. The bare
 * `if (atomVal !== urlVal)` first-render-ref pattern that this hook originally
 * shipped with surfaced a render storm under Stage 2 (LayersTab adds enough
 * subscriber pressure to trip React's update-depth guard during async URL
 * propagation). Pattern parity with useSidebarPanelUrlSync (LS-005 follow-up).
 */
export function useSiteUrlSync() {
  const [atomVal, setAtomVal] = useAtom(activeSiteAtom);
  const [urlVal, setUrlVal] = useQueryState('site', siteParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'push' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom (initial hydration + back-button navigation)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between activeScenarioAtom and ?scenario=. Uses
 * replaceState so rapid scenario flips don't pollute the back stack — the
 * back button should jump between sites, not between every scenario tweak.
 *
 * Loop avoidance: same one-shot ignore-flag pattern as useSidebarPanelUrlSync.
 */
export function useScenarioUrlSync() {
  const [atomVal, setAtomVal] = useAtom(activeScenarioAtom);
  const [urlVal, setUrlVal] = useQueryState('scenario', scenarioParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom (initial hydration + back-button navigation)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/** Convert a `YYYY-MM` ISO month to a sortable integer (months since year 0).
 *  Returns null for malformed input. Exported for unit testing. */
export function isoMonthsSinceEpoch(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return Number(m[1]) * 12 + month - 1;
}

/** Returns the index in `range` whose ISO month is closest (in months) to
 *  `target`. Returns null if `target` is malformed or `range` has no
 *  parseable entries. On a tie, returns the lower index (first match wins).
 *  Exported for unit testing. */
export function closestRangeIndex(
  range: readonly string[],
  target: string,
): number | null {
  const t = isoMonthsSinceEpoch(target);
  if (t === null) return null;
  let bestIdx = -1;
  let bestDist = Infinity;
  for (let i = 0; i < range.length; i++) {
    const v = isoMonthsSinceEpoch(range[i]?.slice(0, 7) ?? '');
    if (v === null) continue;
    const d = Math.abs(t - v);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx === -1 ? null : bestIdx;
}

/**
 * Bidirectional mirror between timeStepAtom (numeric index) and ?t=YYYY-MM
 * (ISO month string). Conversion is via timeRangeAtom lookup — the atom
 * holds the index into the range; the URL holds the human-meaningful month.
 *
 * Uses replaceState so rapid time scrubs don't pollute the back stack.
 *
 * Loop avoidance: same one-shot ignore-flag pattern as useSidebarPanelUrlSync /
 * useSiteUrlSync / useVisibleLayersUrlSync. The bare `currentISO !== urlVal`
 * guard would dedupe in the steady state but doesn't survive React 18's
 * batched-update timing once a high-frequency subscriber (e.g. a time slider)
 * is also in the tree — the same render-storm shape that bit the other hooks.
 * Pre-emptive parity fix.
 *
 * Out-of-range / mismatched URL: when `?t=` is a valid `YYYY-MM` but isn't
 * present in the current `timeRangeAtom` (e.g. a section narrowed the range
 * to a 2024 window after the URL said `2025-06`), the atom snaps to the
 * closest entry so the URL still has a meaningful effect. A dev-mode
 * `console.warn` flags the snap so a typo or stale link isn't silently
 * downgraded. When `?t=` is fully malformed (`'not-a-date'`), the atom is
 * left alone.
 */
export function useTimeStepUrlSync() {
  const [step, setStep] = useAtom(timeStepAtom);
  const [range] = useAtom(timeRangeAtom);
  const [urlVal, setUrlVal] = useQueryState('t', tParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  const currentISO = range[step]?.slice(0, 7) ?? null;

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (currentISO && currentISO !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(currentISO, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentISO]);

  // URL → atom (initial hydration + back-button navigation)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (!urlVal) return;
    const matchIdx = range.findIndex((iso) => iso.slice(0, 7) === urlVal);
    if (matchIdx !== -1) {
      if (matchIdx !== step) {
        ignoreNextAtom.current = true;
        setStep(matchIdx);
      }
      return;
    }
    // Out-of-range or mismatched: snap to closest, warn in dev.
    const fallback = closestRangeIndex(range, urlVal);
    if (fallback === null) return;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.warn(
        `[useTimeStepUrlSync] ?t=${urlVal} not in current timeRange; ` +
          `snapping to closest entry ${range[fallback]?.slice(0, 7)} (idx ${fallback}).`,
      );
    }
    if (fallback !== step) {
      ignoreNextAtom.current = true;
      setStep(fallback);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal, range]);
}

/**
 * Bidirectional mirror between visibleLayersAtom and ?layers=. Layers are
 * comma-joined preserving z-order (bottom → top). Uses replaceState so
 * rapid layer toggles don't pollute the back stack.
 *
 * Loop avoidance: same one-shot ignore-flag pattern as useSidebarPanelUrlSync /
 * useSiteUrlSync. The bare comma-join equality guard surfaced a render storm
 * once the LayersTab's row checkboxes started writing to visibleLayersAtom
 * with rapid React 18 + nuqs async-update timing — clicking a checkbox would
 * flicker the URL between with and without the layer id forever. The flags
 * break the round-trip without a value-equality hazard (a layer can be added,
 * removed, and re-added; one-shot booleans survive that cleanly while
 * value-equality dedup wouldn't).
 *
 * Also: nuqs may surface `null` when ?layers= is absent even though
 * `layersParser.parse(null)` returns `[]` — nuqs treats null as "absent"
 * independently of the parser. Normalize once so both directions of the
 * mirror reason about a real array.
 */
export function useVisibleLayersUrlSync() {
  const [atomVal, setAtomVal] = useAtom(visibleLayersAtom);
  const [urlVal, setUrlVal] = useQueryState('layers', layersParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  const urlList = urlVal ?? [];
  const atomKey = atomVal.join(',');
  const urlKey = urlList.join(',');

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomKey !== urlKey) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomKey]);

  // URL → atom (initial hydration + back-button navigation)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlKey !== atomKey) {
      ignoreNextAtom.current = true;
      setAtomVal(urlList);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlKey]);
}

const VIEWPORT_THROTTLE_MS = 300;

function sameViewport(a: MapViewport, b: MapViewport): boolean {
  return (
    a.center[0] === b.center[0] &&
    a.center[1] === b.center[1] &&
    a.zoom === b.zoom &&
    a.bearing === b.bearing &&
    a.pitch === b.pitch
  );
}

/**
 * Bidirectional mirror between mapViewportAtom and ?v=lng,lat,zoom,bearing,pitch.
 * Atom → URL is throttled at 300ms — pan/zoom emits many viewport updates per
 * second; without throttling the URL would thrash. URL → atom is immediate.
 *
 * Loop avoidance: the throttle naturally suppresses cycle initiations, and the
 * `sameViewport` deep-compare on URL → atom guards against re-applying our own
 * throttled write. Note: useQueryState returns null when ?v= is absent, so we
 * also gate the URL → atom path on `urlVal !== null`.
 */
export function useViewportUrlSync() {
  const [atomVal, setAtomVal] = useAtom(mapViewportAtom);
  const [urlVal, setUrlVal] = useQueryState('v', viewportParser);
  const pendingRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // atom → URL, throttled
  useEffect(() => {
    if (pendingRef.current) clearTimeout(pendingRef.current);
    pendingRef.current = setTimeout(() => {
      void setUrlVal(atomVal, { history: 'replace' });
    }, VIEWPORT_THROTTLE_MS);
    return () => {
      if (pendingRef.current) clearTimeout(pendingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom, immediate
  useEffect(() => {
    if (urlVal !== null && !sameViewport(urlVal, atomVal)) {
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between sidebarPanelAtom and ?panel=. Uses replaceState
 * — panel changes happen often (clicking rail icons) and shouldn't pollute the
 * back stack.
 *
 * Loop avoidance: this hook is a special case among the 6 URL-sync hooks
 * because `sidebarPanelAtom` is also wrapped in `atomWithStorage` (sessionStorage,
 * `getOnInit: true`). With two persistence layers and an async URL update, the
 * basic first-render-ref pattern from useSiteUrlSync isn't sufficient — atom
 * and URL writes echo back and forth fast enough to trip React's
 * "Maximum update depth exceeded" guard once a `<SidebarPanel>` subscriber is
 * also in the tree. Specifically: rail click writes atom → atomWithStorage
 * persists → effect 1 writes URL → nuqs propagates → effect 2 sees urlVal
 * change while atomVal is mid-flight → setAtomVal echoes back into atom →
 * effect 1 fires again → loop.
 *
 * Fix: one-shot "ignore next echo" flags. When effect 1 writes to URL, it
 * sets `ignoreNextUrl=true` so the next urlVal change (which is the echo of
 * what WE just wrote) is consumed and skipped. Same in reverse for effect 2.
 * Value-equality dedup is unreliable here because the panel atom can legitimately
 * cycle through repeated values (e.g. null → 'layers' → null → 'layers'), but
 * one-shot flags survive repeated values cleanly. URL still wins on mount via
 * the existing first-render-ref guard on effect 1.
 */
export function useSidebarPanelUrlSync() {
  const [atomVal, setAtomVal] = useAtom(sidebarPanelAtom);
  const [urlVal, setUrlVal] = useQueryState('panel', panelParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      // This atom change is the echo of a URL → atom write we just made.
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom (initial hydration + back-button navigation)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      // This URL change is the echo of an atom → URL write we just made.
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between selectedPolygonAtom and ?polygon=. Encodes as
 * '{layerId}--{featureId}'. Uses replaceState — selecting a polygon shouldn't
 * pollute the back stack on every click; back-button continues to mean
 * 'previous site / scenario / panel.'
 *
 * Loop avoidance: same one-shot ignore-flag pattern as useSidebarPanelUrlSync
 * (LS-005). Value equality uses a dedicated refsEqual helper rather than
 * reference equality because SelectedPolygonRef is an object that is
 * reconstructed on each parse (same logical value, different reference).
 */
export function useSelectedPolygonUrlSync() {
  const [atomVal, setAtomVal] = useAtom(selectedPolygonAtom);
  const [urlVal, setUrlVal] = useQueryState('polygon', polygonParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  function refsEqual(
    a: SelectedPolygonRef | null,
    b: SelectedPolygonRef | null,
  ): boolean {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.layerId === b.layerId && String(a.featureId) === String(b.featureId);
  }

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (!refsEqual(atomVal, urlVal)) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom (initial hydration / deep-link cold load)
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (!refsEqual(urlVal, atomVal)) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

// Compare mode URL sync hooks (SC-018)

/**
 * Bidirectional mirror between activeScenarioAtom and ?a= (the /compare baseline,
 * "Scenario A"). On the /compare route this is the only hook syncing
 * activeScenarioAtom; the explore page uses ?scenario= via useScenarioUrlSync, so
 * the two params never contend (different routes mount different providers). This
 * makes a direct /compare?a=<id> load / refresh / shared link preserve Scenario A
 * instead of falling back to basecase. Same one-shot ignore-flag pattern as B.
 */
export function useCompareScenarioAUrlSync() {
  const [atomVal, setAtomVal] = useAtom(activeScenarioAtom);
  const [urlVal, setUrlVal] = useQueryState('a', compareScenarioAParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between compareScenarioBAtom and ?b=.
 * Follows the same one-shot ignore-flag pattern as other sync hooks.
 */
export function useCompareScenarioBUrlSync() {
  const [atomVal, setAtomVal] = useAtom(compareScenarioBAtom);
  const [urlVal, setUrlVal] = useQueryState('b', compareScenarioBParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between compareVerticalAtom and ?v=.
 */
export function useCompareVerticalUrlSync() {
  const [atomVal, setAtomVal] = useAtom(compareVerticalAtom);
  const [urlVal, setUrlVal] = useQueryState('v', compareVerticalParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== null && urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Bidirectional mirror between compareLayoutModeAtom and ?mode=.
 */
export function useCompareLayoutModeUrlSync() {
  const [atomVal, setAtomVal] = useAtom(compareLayoutModeAtom);
  const [urlVal, setUrlVal] = useQueryState('mode', compareLayoutModeParser);
  const isFirstRender = useRef(true);
  const ignoreNextUrl = useRef(false);
  const ignoreNextAtom = useRef(false);

  // atom → URL
  useEffect(() => {
    if (isFirstRender.current) return;
    if (ignoreNextAtom.current) {
      ignoreNextAtom.current = false;
      return;
    }
    if (atomVal !== urlVal) {
      ignoreNextUrl.current = true;
      void setUrlVal(atomVal, { history: 'replace' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atomVal]);

  // URL → atom
  useEffect(() => {
    isFirstRender.current = false;
    if (ignoreNextUrl.current) {
      ignoreNextUrl.current = false;
      return;
    }
    if (urlVal !== null && urlVal !== atomVal) {
      ignoreNextAtom.current = true;
      setAtomVal(urlVal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlVal]);
}

/**
 * Mount all 4 compare URL-sync hooks at once. Place this in the ScenarioCompareRoute
 * component to enable full URL ↔ atom synchronization for compare mode.
 */
export function useCompareUrlSyncProvider() {
  useCompareScenarioAUrlSync();
  useCompareScenarioBUrlSync();
  useCompareVerticalUrlSync();
  useCompareLayoutModeUrlSync();
}

/**
 * Mount all 7 URL-sync hooks at once. Place this in any client component
 * tree where you want full URL ↔ atom synchronization (typically the explore
 * page root, inside <StateProvider>).
 */
export function useUrlSyncProvider() {
  useSiteUrlSync();
  useScenarioUrlSync();
  useTimeStepUrlSync();
  useVisibleLayersUrlSync();
  useViewportUrlSync();
  useSidebarPanelUrlSync();
  useSelectedPolygonUrlSync();
}
