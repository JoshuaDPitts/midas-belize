// src/atoms/url-parsers.ts
// Typed URL parsers for the 5 atoms that round-trip through the URL.
// Stage 2 of the state-management subsystem (SM-007); consumed by the
// per-atom URL-sync hooks (SM-008..013) and the share-link helper (SM-016).
//
// All parsers are built with `createParser` so they retain the full
// nuqs `SingleParserBuilder` shape (`useQueryState` consumes that). On top
// of that we widen `parse` to accept `string | null` — every consumer
// (hooks reading `searchParams.get(key)` and the share-link helper) gets a
// raw search-string-or-null, and asking each call site to null-check first
// would just push the same defaulting logic into every caller.
import { createParser } from 'nuqs';
import type { MapViewport, SidebarPanel, SelectedPolygonRef } from '@/atoms';
import type { SiteId } from '@/lib/map/core/constants';
import { isValidScenarioId } from '@/features/scenarios/matrix';
import type { ScenarioId } from '@/features/scenarios/matrix';

// Source-of-truth match for the SiteId literal type. Adding a site
// requires updating both this list and `SiteId` in @/lib/map/core/constants.
export const SITES = [
  'laughing-bird',
  'placencia',
  'caye-caulker',
] as const satisfies readonly SiteId[];

const SITE_SET: ReadonlySet<string> = new Set(SITES);
const isSiteId = (v: string): v is SiteId => SITE_SET.has(v);

/** Parse a raw URL-search value (or null) into a typed value `T`. */
type NullableParse<T> = (raw: string | null) => T;

/**
 * Wrap a nuqs builder so `parse` advertises `string | null` input. nuqs's
 * `parse` runtime is permissive — it tolerates null/empty — but its type
 * is `(s: string) => T | null`. We replace just the `parse` field; the
 * rest of the builder (`serialize`, `parseServerSide`, `withDefault`, etc.)
 * is shallow-copied through the spread, so this builder is still a valid
 * argument to `useQueryState`.
 */
function widenParse<T, B extends { parse: (raw: string) => unknown }>(
  builder: B,
  parse: NullableParse<T>,
): Omit<B, 'parse'> & { parse: NullableParse<T> } {
  return { ...builder, parse };
}

// Site enum parser.
const siteParseFn: NullableParse<SiteId | null> = (v) =>
  v && isSiteId(v) ? v : null;
export const siteParser = widenParse(
  createParser<SiteId | null>({
    parse: siteParseFn,
    serialize: (v) => v ?? '',
  }),
  siteParseFn,
);

// Scenario parser with validation; empty string or invalid ID → null.
const scenarioParseFn: NullableParse<ScenarioId | null> = (v) =>
  isValidScenarioId(v) ? v : null;
export const scenarioParser = widenParse(
  createParser<ScenarioId | null>({
    parse: scenarioParseFn,
    serialize: (v) => v ?? '',
  }),
  scenarioParseFn,
);

// Time-step parser. Falls back to the documented default ("2026-01") when
// the URL is missing or empty, so consumers always see a usable string.
const T_DEFAULT = '2026-01';
const tParseFn: NullableParse<string> = (v) =>
  v && v.length > 0 ? v : T_DEFAULT;
export const tParser = widenParse(
  createParser<string>({
    parse: tParseFn,
    serialize: (v) => v,
  }),
  tParseFn,
);

// Visible-layers parser. Comma-separated list; empty/missing → [].
const layersParseFn: NullableParse<string[]> = (v) =>
  v && v.length > 0 ? v.split(',') : [];
export const layersParser = widenParse(
  createParser<string[]>({
    parse: layersParseFn,
    serialize: (v) => v.join(','),
  }),
  layersParseFn,
);

/**
 * Viewport encodes as `lng,lat,zoom,bearing,pitch`. lng/lat get 4-decimal
 * precision (≈11m at the equator); zoom/bearing/pitch round to integers.
 * Returns null on malformed input so the consumer falls back to defaults.
 */
const viewportParseFn: NullableParse<MapViewport | null> = (raw) => {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 5 || parts.some((n) => !Number.isFinite(n))) return null;
  const [lng, lat, zoom, bearing, pitch] = parts;
  return { center: [lng, lat], zoom, bearing, pitch };
};
export const viewportParser = widenParse(
  createParser<MapViewport | null>({
    parse: viewportParseFn,
    serialize: (v) => {
      if (!v) return '';
      const lng = Number(v.center[0].toFixed(4));
      const lat = Number(v.center[1].toFixed(4));
      return `${lng},${lat},${Math.round(v.zoom)},${Math.round(v.bearing)},${Math.round(v.pitch)}`;
    },
  }),
  viewportParseFn,
);

// Sidebar-panel enum parser. Source-of-truth match for the SidebarPanel
// literal type in @/atoms — adding a panel requires updating both lists.
const SIDEBAR_PANELS = [
  'layers',
  'inspect',
  'scenarios',
  'domain',
] as const satisfies readonly SidebarPanel[];
const PANEL_SET: ReadonlySet<string> = new Set(SIDEBAR_PANELS);
const isPanelId = (v: string): v is SidebarPanel => PANEL_SET.has(v);

const panelParseFn: NullableParse<SidebarPanel | null> = (v) =>
  v && isPanelId(v) ? v : null;
export const panelParser = widenParse(
  createParser<SidebarPanel | null>({
    parse: panelParseFn,
    serialize: (v) => v ?? '',
  }),
  panelParseFn,
);

/**
 * Polygon selection parser. Serializes SelectedPolygonRef as
 * '{layerId}--{featureId}'. The double-dash separator is chosen to avoid
 * collisions with single-dash used in dataset IDs like
 * 'placencia-marine-polygons'. On malformed input, returns null (no selection).
 */
const polygonParseFn: NullableParse<SelectedPolygonRef | null> = (value) => {
  if (!value) return null;
  const sep = value.indexOf('--');
  if (sep < 0) return null;
  const layerId = value.slice(0, sep);
  const rawFeatureId = value.slice(sep + 2);
  if (!layerId || !rawFeatureId) return null;
  const asNum = Number(rawFeatureId);
  return { layerId, featureId: Number.isNaN(asNum) ? rawFeatureId : asNum };
};
export const polygonParser = widenParse(
  createParser<SelectedPolygonRef | null>({
    parse: polygonParseFn,
    serialize: (ref) => {
      if (!ref) return '';
      return `${ref.layerId}--${ref.featureId}`;
    },
  }),
  polygonParseFn,
);

// Compare mode parsers (SC-018)

// Scenario A (baseline) parser for /compare route. Mirrors Scenario B; an
// absent/invalid ?a= yields null and the route falls back to 'basecase'.
const compareScenarioAParseFn: NullableParse<ScenarioId | null> = (v) =>
  isValidScenarioId(v) ? v : null;
export const compareScenarioAParser = widenParse(
  createParser<ScenarioId | null>({
    parse: compareScenarioAParseFn,
    serialize: (v) => v ?? '',
  }),
  compareScenarioAParseFn,
);

// Scenario B parser for /compare route
const compareScenarioBParseFn: NullableParse<ScenarioId | null> = (v) =>
  isValidScenarioId(v) ? v : null;
export const compareScenarioBParser = widenParse(
  createParser<ScenarioId | null>({
    parse: compareScenarioBParseFn,
    serialize: (v) => v ?? '',
  }),
  compareScenarioBParseFn,
);

// Vertical parser for /compare route (coastal | watershed | marine)
type CompareVertical = 'coastal' | 'watershed' | 'marine';
const VERTICALS: ReadonlySet<string> = new Set(['coastal', 'watershed', 'marine']);
const isVertical = (v: string): v is CompareVertical => VERTICALS.has(v);
const verticalParseFn: NullableParse<CompareVertical> = (v) =>
  v && isVertical(v) ? v : 'coastal';
export const compareVerticalParser = widenParse(
  createParser<CompareVertical>({
    parse: verticalParseFn,
    serialize: (v) => v,
  }),
  verticalParseFn,
);

// Layout mode parser for /compare route (diff | swipe)
type CompareLayoutMode = 'diff' | 'swipe';
const MODES: ReadonlySet<string> = new Set(['diff', 'swipe']);
const isMode = (v: string): v is CompareLayoutMode => MODES.has(v);
const modeParseFn: NullableParse<CompareLayoutMode> = (v) =>
  v && isMode(v) ? v : 'diff';
export const compareLayoutModeParser = widenParse(
  createParser<CompareLayoutMode>({
    parse: modeParseFn,
    serialize: (v) => v,
  }),
  modeParseFn,
);
