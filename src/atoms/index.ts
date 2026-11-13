// src/atoms/index.ts
// Consolidated atom barrel — all Jotai atoms for the application.
// Region order: site → scenario → time → layers → map → ui → tools → derived
import { atom } from 'jotai';
import { atomWithStorage, createJSONStorage } from 'jotai/utils';
import {
  BELIZE_CENTER,
  DEFAULT_ZOOM,
  DEFAULT_BEARING,
  DEFAULT_PITCH,
  type LngLat,
  type SiteId,
} from '@/lib/map/core/constants';
import type { BasemapId } from '@/lib/map/core/styles';
import type { ScenarioId } from '@/features/scenarios/matrix';
import type { Feature } from 'geojson';

// SSR-safe shim: atomWithStorage with `getOnInit: true` reads storage at
// module-load, which crashes during Next.js server rendering where
// localStorage / sessionStorage are undefined. The lambda inside
// createJSONStorage is invoked per-access, so a typeof-window check there
// flips to a no-op shim on the server. The client picks up the real
// persisted value on first read; a brief default→stored hydration mismatch
// is the cost of avoiding the SSR crash.
const noopStorage: Storage = {
  length: 0,
  clear() {},
  getItem: () => null,
  key: () => null,
  removeItem() {},
  setItem() {},
};
function safeJsonStorage<T>(getStorage: () => Storage) {
  return createJSONStorage<T>(() =>
    typeof window === 'undefined' ? noopStorage : getStorage(),
  );
}

//#region site
// (populated by SM-002)
//#endregion

//#region scenario
export const activeScenarioAtom = atom<ScenarioId | null>(null);

// #region compare (Scenario Engine /compare-only)
export const compareScenarioBAtom = atom<ScenarioId | null>(null);
export const compareVerticalAtom = atom<'coastal' | 'watershed' | 'marine'>('coastal');
export const compareLayoutModeAtom = atom<'diff' | 'swipe'>('diff');
// #endregion compare
//#endregion

//#region time
/** Default 24-step range; each step is a monthly ISO date covering 2 yrs. */
function defaultRange(): string[] {
  const out: string[] = [];
  for (let y = 2024; y <= 2025; y++) {
    for (let m = 1; m <= 12; m++) {
      out.push(`${y}-${String(m).padStart(2, '0')}-01`);
    }
  }
  return out;
}

export const timeRangeAtom = atom<string[]>(defaultRange());
export const timeStepAtom = atom<number>(0);
export const playingAtom = atom<boolean>(false);
export const playbackSpeedAtom = atom<number>(1);
//#endregion

//#region layers
/** Visible layer ids in z-order: bottom (index 0) → top. */
export const visibleLayersAtom = atom<string[]>([]);

/** Per-layer alpha in [0, 1]. Missing key = full opacity. */
export const layerOpacityAtom = atom<Record<string, number>>({});
//#endregion

//#region map
export interface MapViewport {
  center: LngLat;
  zoom: number;
  bearing: number;
  pitch: number;
}

export interface FeatureHit {
  layerId: string;
  featureId: string | number;
  properties: Record<string, unknown>;
  lngLat: LngLat;
}

export const mapViewportAtom = atom<MapViewport>({
  center: BELIZE_CENTER,
  zoom: DEFAULT_ZOOM,
  bearing: DEFAULT_BEARING,
  pitch: DEFAULT_PITCH,
});

export const inspectedFeatureAtom = atom<FeatureHit | null>(null);

/** Selection keyed on `${layerId}:${featureId}`. */
export const selectionAtom = atom<Set<string>>(new Set<string>());

// Marine vertical-specific encoding mode
// NOTE: no getOnInit:true here. With the SSR-safe noopStorage shim, server
// reads default and client reads the stored value, which trips React's
// hydration mismatch on EncoderPicker + MapLegend. Default-on-both-sides +
// post-mount rehydrate (same pattern as sidebarPanelAtom) eliminates the
// warning at the cost of a one-frame flash of the default encoding.
export type MarineEncodingMode = 'nbs' | 'clade' | 'restoration' | 'biomass';
export const marineEncodingAtom = atomWithStorage<MarineEncodingMode>(
  'marine-encoding',
  'nbs',
  safeJsonStorage<MarineEncodingMode>(() => localStorage),
);

// Laughing Bird coral-biomass scenario controls (LBD scenario viz). Plain
// in-memory atoms, not persisted — these are scoped to a single-site
// scenario explorer, not a cross-session preference like marineEncodingAtom.
/** 0 = baseline climate, 1 = RCP-4.5 climate change scenario. */
export const coralClimateAtom = atom<0 | 1>(0);
/** 0 = no restoration plan, 1 = restoration plan implemented. */
export const coralPlanAtom = atom<0 | 1>(0);
/** Explicit year pick, or null to mean "use the latest available year". */
export const coralYearAtom = atom<number | null>(null);
/**
 * Coral biomass choropleth species selector. `'all'` sums the three modelled
 * species per polygon (the default); `1 | 2 | 3` isolates a single species'
 * biomass (species_id in output-lb-coral-biomass-by-species-yearly). In-memory
 * only — scoped to the Laughing Bird scenario explorer, like the other coral atoms.
 */
export type CoralSpecies = 'all' | 1 | 2 | 3;
export const coralSpeciesAtom = atom<CoralSpecies>('all');

/**
 * Clicked-polygon popup for the Laughing Bird coral map. Holds the polygon's
 * unique id (mimes_id, also the biomass polygon_id) and the click lng/lat so
 * <CoralPolygonPopup> can anchor a floating card over the map. Null = closed.
 */
export interface CoralPopupRef {
  featureId: string | number;
  polygonId: number;
  lngLat: [number, number];
}
export const coralPopupAtom = atom<CoralPopupRef | null>(null);

// Watershed encoder — same hydration-fix pattern as marineEncodingAtom: no
// getOnInit:true so SSR and CSR first-paint match.
export type WatershedEncodingMode = 'nbs' | 'clade' | 'restoration' | 'erosion-risk';
export const watershedEncodingAtom = atomWithStorage<WatershedEncodingMode>(
  'watershed-encoding',
  'nbs',
  safeJsonStorage<WatershedEncodingMode>(() => localStorage),
);

export interface SelectedPolygonRef {
  layerId: string;
  featureId: string | number;
}
export const selectedPolygonAtom = atom<SelectedPolygonRef | null>(null);
export const hoveredPolygonAtom = atom<SelectedPolygonRef | null>(null);

/** Watershed compare swiper — left/right polygon refs by feature id.
 * Wired by WatershedHeroCard's "Compare to…" CTA (WS-013); consumed by the
 * compare swiper feature (WS-035). Stays null/null when no comparison
 * has been opened. */
export interface SwipeWatershedRef {
  left: string | number | null;
  right: string | number | null;
}
export const swipeWatershedAtom = atom<SwipeWatershedRef>({ left: null, right: null });

/** Per-factor weight overrides for the NbS priority ranking (WS-024).
 * Keys are factor ids; missing keys fall back to `factor.defaultWeight`.
 * Persisted to localStorage so the user's slider state survives reloads.
 * No `getOnInit:true` per the hydration-fix pattern: SSR + first client
 * paint use `{}` (default weights), and the persisted overrides hydrate
 * post-mount via the normal Jotai subscription. */
export const nbsRankWeightsAtom = atomWithStorage<Record<string, number>>(
  'watershed-nbs-rank-weights',
  {},
  safeJsonStorage<Record<string, number>>(() => localStorage),
);

/** Active R-factor month for the watershed map raster overlay (WS-026).
 * Null = overlay hidden. 1..12 = render that month's raster. Persisted to
 * localStorage so the user's last picked month survives reloads. No
 * `getOnInit:true` per the hydration-fix pattern. */
export type RFactorMonth = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export const rfactorMonthAtom = atomWithStorage<RFactorMonth | null>(
  'watershed-rfactor-month',
  null,
  safeJsonStorage<RFactorMonth | null>(() => localStorage),
);

/** When true, the user picked a month manually via RainfallSeasonality
 * (WS-028) and the timeline-driven auto-advance (WS-027 sync rule) is
 * paused until "Resume timeline" clears the flag. In-memory only — a
 * reload resets the override back to false so the timeline can drive
 * the raster overlay again. */
export const manualMonthOverrideAtom = atom<boolean>(false);

/** Toggle for the erosion-hotspot heatmap (WS-030). When true, a
 * Deck.gl HexagonLayer renders RUSLE A-aggregated hotspots and the
 * base watershed polygon fills dim so the hotspots read clearly.
 * In-memory only — a reload starts hidden. */
export const erosionHotspotEnabledAtom = atom<boolean>(false);

/** Split percentage for the WatershedSwipe primitive (WS-031). 0 = handle
 * all the way left (only the right polygon visible), 100 = all the way
 * right (only the left polygon visible). Default 50 = even split.
 * In-memory only; resets per session. */
export const swipeSplitAtom = atom<number>(50);

// Drives SidebarPanel width — 340 default, 480 when polygon focused
export const sidebarPanelWidthAtom = atom((get) => {
  const focused = get(selectedPolygonAtom) !== null;
  return focused ? 480 : 340;
});

export const basemapAtom = atomWithStorage<BasemapId>(
  'midas-basemap',
  'light',
  safeJsonStorage<BasemapId>(() => localStorage),
  { getOnInit: true },
);

/** Currently-selected study site, or null for the default Belize view.
 * Flipped by `useSiteNavigation().flyToSite / fitBelize`. */
export const activeSiteAtom = atom<SiteId | null>(null);
//#endregion

//#region ui
export type Theme = 'dark' | 'light';
export const themeAtom = atomWithStorage<Theme>(
  'midas-theme',
  'light',
  safeJsonStorage<Theme>(() => localStorage),
  { getOnInit: true },
);

export type SidebarPanel = 'layers' | 'inspect' | 'scenarios' | 'domain';
// NOTE: no getOnInit:true here — picking a site auto-opens this panel via
// NavBar.pickSite, and combining that with a stored value caused a Next.js
// dev-overlay-blocking hydration mismatch (server saw null, client saw the
// stored value). Initial render is null on both sides; sessionStorage
// rehydrates after mount via Jotai's normal subscription, no mismatch.
export const sidebarPanelAtom = atomWithStorage<SidebarPanel | null>(
  'midas-sidebar-panel',
  null,
  safeJsonStorage<SidebarPanel | null>(() => sessionStorage),
);

// activeFeatureAtom — the currently "active" Phase 2 vertical, identified by
// its FeatureManifest id (e.g. 'marine', 'watershed'). DomainTab writes this
// when the user switches sub-tabs; MapArea filters mapOverlays by it so each
// vertical owns the map UI exclusively when its Domain content is showing.
// Null means no explicit pick yet, at which point MapArea defaults to the
// first manifest that contributes domainContent.
export const activeFeatureAtom = atom<string | null>(null);
//#endregion

//#region tools
// Draw mode + transient shape + query result atoms for ME-008.

export type DrawMode = 'none' | 'point' | 'area' | 'transect';

/** Currently-drawing shape. Polygon verts accumulate as the user clicks;
 *  transect holds [start] after first click and [start, end] on second. */
export interface InFlightShape {
  mode: Exclude<DrawMode, 'none'>;
  points: LngLat[];
}

export interface NumericStats {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  stddev: number;
}

export interface AreaSummary {
  layerId: string;
  count: number;
  numeric: Record<string, NumericStats>;
}

export interface TransectSample {
  distance: number; // kilometers from line start
  lngLat: LngLat;
  values: Record<string, Record<string, number | null>>; // layerId → attr → value (null = no hit)
}

export interface TransectProfile {
  samples: TransectSample[];
  vectorHits: FeatureHit[];
}

export type QueryResult =
  | { kind: 'point';    hits: FeatureHit[] }
  | { kind: 'area';     summaries: AreaSummary[] }
  | { kind: 'transect'; profile: TransectProfile }
  | null;

export const drawModeAtom = atom<DrawMode>('none');
export const drawInFlightAtom = atom<InFlightShape | null>(null);
/** Last committed shape — stays rendered until the mode changes or Esc
 * resets. Lets the UI show a persistent marker at the query anchor (the
 * clicked point, the closed polygon, or the endpoints of the transect). */
export const drawCommittedAtom = atom<InFlightShape | null>(null);
export const queryResultAtom = atom<QueryResult>(null);

/** A vertical's currently-exportable feature set (MC-006). Verticals publish
 * the active layer's features here (MC-007); the MapExportMenu reads it for
 * GeoJSON / CSV export and intersects it with `selectionAtom` when a
 * selection is active. Null = nothing exportable, so the data buttons sit
 * disabled until a vertical populates a source. */
export interface ExportableSource {
  layerId: string;
  label: string;
  features: Feature[];
}
export const exportableFeaturesAtom = atom<ExportableSource | null>(null);
//#endregion

//#region coastal
export type CoastalResolution = 'hires' | 'lores';
export const coastalResolutionAtom = atomWithStorage<CoastalResolution>(
  'coastal-resolution', 'hires',
  safeJsonStorage<CoastalResolution>(() => localStorage),
);

export type CoastalEncodingMode = 'vulnerability' | 'mangrove' | 'scenario-delta';
export const coastalEncodingAtom = atom<CoastalEncodingMode>('vulnerability');
export const coastalAutoEncodingAtom = atom<boolean>(true);
//#endregion

//#region derived
import {
  _layerCatalogCacheAtom,
  _scenariosCacheAtom,
} from '@/atoms/cache-bridge';
// SM-016: serialize all URL-shareable atoms into a `?...` query string for share links.
import {
  siteParser,
  scenarioParser,
  layersParser,
  viewportParser,
} from '@/atoms/url-parsers';

/** All catalog rows for the active site (mirrors the SWR cache). Empty when no site. */
export const layersForActiveSiteAtom = atom((get) => {
  const site = get(activeSiteAtom);
  if (!site) return [];
  return get(_layerCatalogCacheAtom);
});

/** Visible layers as full LayerSummary objects, in z-order (bottom→top). Drops ids missing from the cache. */
export const visibleLayerObjectsAtom = atom((get) => {
  const ids = get(visibleLayersAtom);
  const all = get(layersForActiveSiteAtom);
  const byId = new Map(all.map((l) => [l.id, l]));
  return ids
    .map((id) => byId.get(id))
    .filter((x): x is NonNullable<typeof x> => !!x);
});

/** Scenarios for the active site (mirrors the SWR cache). */
export const activeSiteScenariosAtom = atom((get) => {
  const site = get(activeSiteAtom);
  if (!site) return [];
  return get(_scenariosCacheAtom);
});

/** ISO date string for the current time step (or null if out of range). */
export const currentTimeISOAtom = atom((get) => {
  const range = get(timeRangeAtom);
  const step = get(timeStepAtom);
  return range[step] ?? null;
});

/** Marine encoding to actually render, reconciling the persisted global
 * marineEncodingAtom with the Laughing Bird special case: that site is a
 * single-site coral-biomass scenario explorer with no NbS/clade/restoration
 * data, so it always renders the biomass choropleth regardless of what the
 * EncoderPicker last wrote. MarineMapLayers and MapLegend both read this
 * (instead of marineEncodingAtom directly) so the map fill and the legend
 * never diverge on which encoding is "active". EncoderPicker itself keeps
 * writing the raw marineEncodingAtom — this atom only affects the read side.
 *
 * Conversely, 'biomass' only means anything on Laughing Bird (its dataset
 * joins on polygon_id 1..43); on every other site it has no matching data
 * and would render every polygon as the grey fallback with a meaningless
 * legend. Since marineEncodingAtom is persisted (atomWithStorage), a user
 * picking Biomass on Laughing Bird and then navigating to Placencia or Caye
 * Caulker would otherwise carry that selection over. Fall back to 'nbs' in
 * that case. */
export const effectiveMarineEncodingAtom = atom((get) => {
  const site = get(activeSiteAtom);
  if (site === 'laughing-bird') return 'biomass' as const;
  const stored = get(marineEncodingAtom);
  if (stored === 'biomass') return 'nbs' as const;
  return stored;
});

/** Serialized URL fragment (starts with '?') reflecting all URL-shareable atoms. */
export const urlSnapshotAtom = atom((get) => {
  const params = new URLSearchParams();
  const site = get(activeSiteAtom);
  if (site) params.set('site', siteParser.serialize(site));
  const scenario = get(activeScenarioAtom);
  if (scenario) params.set('scenario', scenarioParser.serialize(scenario));
  const iso = get(currentTimeISOAtom);
  if (iso) params.set('t', iso.slice(0, 7));
  const layers = get(visibleLayersAtom);
  if (layers.length > 0) params.set('layers', layersParser.serialize(layers));
  const vp = get(mapViewportAtom);
  params.set('v', viewportParser.serialize(vp));
  return `?${params.toString()}`;
});

/** True when the URL-shareable state is at defaults. Viewport is intentionally
 * excluded — panning/zooming shouldn't disable the Reset button. */
export const isDefaultViewAtom = atom((get) => {
  return (
    get(activeSiteAtom) === null &&
    get(activeScenarioAtom) === null &&
    get(visibleLayersAtom).length === 0 &&
    get(timeStepAtom) === 0
  );
});
//#endregion
