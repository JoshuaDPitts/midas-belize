'use client';
// src/components/app-shell/MapDrawController.tsx
//
// Deck-aware draw controller for the real app shell (DEC-031). Unlike the
// `/map` showcase's engine-store DrawController, this one drives the pure
// draw state machine from MapLibre click/dblclick/Esc, picks the verticals'
// Deck.gl features via `overlay.pickObject`/`pickObjects` (the verticals are
// Deck layers, invisible to `map.queryRenderedFeatures`), writes the result
// to `queryResultAtom` (rendered by InspectTab), and renders the amber draw
// ghost as MapLibre-native layers so it never clobbers the verticals'
// `overlay.setProps({ layers })` call.

import { useEffect, useRef } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import type { GeoJSONSource, MapMouseEvent } from 'maplibre-gl';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import { booleanPointInPolygon, point, polygon as turfPolygon } from '@turf/turf';
import { useMap, useDeckOverlay } from '@/lib/map';
import {
  drawModeAtom,
  drawInFlightAtom,
  drawCommittedAtom,
  queryResultAtom,
  selectionAtom,
  inspectedFeatureAtom,
  selectedPolygonAtom,
  type InFlightShape,
  type FeatureHit,
  type TransectSample,
  type TransectProfile,
} from '@/atoms';
import { reduce, initialState, type DrawState, type DrawEvent } from '@/lib/map/interaction/drawStateMachine';
import { queryInBbox, sampleLine } from '@/lib/map/interaction/queries';
import { buildKey, type FeatureId } from '@/lib/map/interaction/selectionKey';
import type { LngLat } from '@/lib/map/core/constants';

// ——————————————————————————————————————————————————————————————
// Pure helpers (exported for unit testing — no map / overlay required).
// ——————————————————————————————————————————————————————————————

/** Resolve a feature id from a property bag using the union of id fields the
 *  three verticals key on (marine: MIMES_ID/id/ID/GRID_ID/Name; coastal:
 *  Polygon_ID; watershed: Polygon_ID/Name). Trailing `.0` is stripped so a
 *  numeric-as-string id matches the selection key written on click. */
export function featureIdFromProps(props: Record<string, unknown>): string | null {
  const raw =
    (props.MIMES_ID as string | number | undefined) ??
    (props.Polygon_ID as string | number | undefined) ??
    (props.id as string | number | undefined) ??
    (props.ID as string | number | undefined) ??
    (props.GRID_ID as string | undefined) ??
    (props.Name as string | undefined);
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw).replace(/\.0+$/, '');
}

interface MinimalPick {
  layer: { id: string } | null;
  object?: unknown;
  index: number;
}

/** Convert a Deck picking result into a FeatureHit. Falls back to the picking
 *  index when the feature carries no recognizable id field. */
export function pickToHit(info: MinimalPick, lngLat: [number, number]): FeatureHit | null {
  if (!info.layer || !info.object) return null;
  const obj = info.object as Record<string, unknown>;
  const props = ((obj.properties as Record<string, unknown> | undefined) ?? obj) as Record<
    string,
    unknown
  >;
  const id = featureIdFromProps(props);
  const featureId: FeatureId = id ?? info.index;
  return { layerId: info.layer.id, featureId, properties: props, lngLat };
}

type GhostKind = 'inflight' | 'committed';
interface GhostProps {
  g: 'pt' | 'line' | 'poly';
  kind: GhostKind;
}

/** Build the MapLibre-native ghost geometry for the committed + in-flight
 *  shapes: a vertex point per click, a line for transects, a closed polygon
 *  for areas (a 2-vertex area renders as a line until the 3rd vertex). */
export function ghostCollection(
  inFlight: InFlightShape | null,
  committed: InFlightShape | null,
): FeatureCollection<Geometry, GhostProps> {
  const features: Feature<Geometry, GhostProps>[] = [];
  const add = (shape: InFlightShape | null, kind: GhostKind): void => {
    if (!shape || shape.points.length === 0) return;
    for (const p of shape.points) {
      features.push({ type: 'Feature', properties: { g: 'pt', kind }, geometry: { type: 'Point', coordinates: p } });
    }
    if (shape.mode === 'transect' && shape.points.length >= 2) {
      features.push({ type: 'Feature', properties: { g: 'line', kind }, geometry: { type: 'LineString', coordinates: shape.points } });
    }
    if (shape.mode === 'area') {
      if (shape.points.length >= 3) {
        const ring = [...shape.points, shape.points[0]];
        features.push({ type: 'Feature', properties: { g: 'poly', kind }, geometry: { type: 'Polygon', coordinates: [ring] } });
      } else if (shape.points.length >= 2) {
        features.push({ type: 'Feature', properties: { g: 'line', kind }, geometry: { type: 'LineString', coordinates: shape.points } });
      }
    }
  };
  add(committed, 'committed');
  add(inFlight, 'inflight');
  return { type: 'FeatureCollection', features };
}

function representativePoint(object: unknown): LngLat | null {
  const g = (object as { geometry?: GeoJSON.Geometry } | null)?.geometry;
  if (!g) return null;
  if (g.type === 'Point') return g.coordinates as LngLat;
  if (g.type === 'Polygon') return (g.coordinates?.[0]?.[0] ?? null) as LngLat | null;
  if (g.type === 'MultiPolygon') return (g.coordinates?.[0]?.[0]?.[0] ?? null) as LngLat | null;
  if (g.type === 'LineString') return (g.coordinates?.[0] ?? null) as LngLat | null;
  return null;
}

// ——————————————————————————————————————————————————————————————
// Component
// ——————————————————————————————————————————————————————————————

const SAMPLE_COUNT = 48; // GPU picks per transect commit (one-shot; keep modest)
const GHOST_SRC = 'draw-ghost-src';
const GHOST_FILL = 'draw-ghost-fill';
const GHOST_LINE = 'draw-ghost-line';
const GHOST_PTS = 'draw-ghost-pts';
const AMBER = '#f59e0b';
const EMPTY_FC: FeatureCollection = { type: 'FeatureCollection', features: [] };

export function MapDrawController() {
  const map = useMap();
  const overlay = useDeckOverlay();
  const [mode, setMode] = useAtom(drawModeAtom);
  const setInFlight = useSetAtom(drawInFlightAtom);
  const setCommitted = useSetAtom(drawCommittedAtom);
  const setResult = useSetAtom(queryResultAtom);
  const setSelection = useSetAtom(selectionAtom);
  const setInspected = useSetAtom(inspectedFeatureAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);

  const inFlight = useAtomValue(drawInFlightAtom);
  const committed = useAtomValue(drawCommittedAtom);

  const stateRef = useRef<DrawState>(initialState);

  // Keep the machine's mode in sync with the atom (toolbar / Esc change it).
  useEffect(() => {
    const out = reduce(stateRef.current, { type: 'setMode', mode });
    stateRef.current = out.state;
    setInFlight(out.state.shape);
    setCommitted(null);
    setResult(null);
  }, [mode, setInFlight, setCommitted, setResult]);

  // Click / dblclick / Esc → state machine → commit → Deck pick → result.
  useEffect(() => {
    if (!map) return;

    function pickAt(lngLat: LngLat): FeatureHit | null {
      if (!overlay || !map) return null;
      const p = map.project(lngLat as [number, number]);
      const info = overlay.pickObject({ x: p.x, y: p.y, radius: 4 });
      const hit = info ? pickToHit(info, [lngLat[0], lngLat[1]]) : null;
      if (hit) {
        const rep = representativePoint(info?.object);
        if (rep) hit.lngLat = rep;
      }
      return hit;
    }

    function pickInArea(ringPts: LngLat[]): FeatureHit[] {
      if (!overlay || !map || ringPts.length < 3) return [];
      const ring = [...ringPts, ringPts[0]] as [number, number][];
      const poly = turfPolygon([ring]);
      const screen = ringPts.map((pt) => map!.project(pt as [number, number]));
      const minX = Math.min(...screen.map((s) => s.x));
      const minY = Math.min(...screen.map((s) => s.y));
      const w = Math.max(1, Math.max(...screen.map((s) => s.x)) - minX);
      const h = Math.max(1, Math.max(...screen.map((s) => s.y)) - minY);
      const picks = overlay.pickObjects({ x: minX, y: minY, width: w, height: h });
      const hits: FeatureHit[] = [];
      const seen = new Set<string>();
      for (const info of picks) {
        const rep = representativePoint(info.object);
        if (rep && !booleanPointInPolygon(point(rep), poly)) continue;
        const hit = pickToHit(info, rep ?? [0, 0]);
        if (!hit) continue;
        const key = buildKey(hit.layerId, hit.featureId);
        if (seen.has(key)) continue;
        seen.add(key);
        hits.push(hit);
      }
      return hits;
    }

    function computeTransect(a: LngLat, b: LngLat): TransectProfile {
      const samples: TransectSample[] = [];
      const vectorHits: FeatureHit[] = [];
      const seen = new Set<string>();
      for (const { lngLat, distance } of sampleLine(a, b, SAMPLE_COUNT)) {
        const hit = pickAt(lngLat);
        const values: Record<string, Record<string, number | null>> = {};
        if (hit) {
          const numeric: Record<string, number | null> = {};
          for (const [k, v] of Object.entries(hit.properties)) {
            if (typeof v === 'number' && Number.isFinite(v)) numeric[k] = v;
          }
          values[hit.layerId] = numeric;
          const key = buildKey(hit.layerId, hit.featureId);
          if (!seen.has(key)) {
            seen.add(key);
            vectorHits.push(hit);
          }
        }
        samples.push({ distance, lngLat, values });
      }
      return { samples, vectorHits };
    }

    function commit(shape: InFlightShape): void {
      setCommitted(shape);
      if (shape.mode === 'point') {
        const hit = pickAt(shape.points[0]);
        if (hit) {
          setInspected(hit);
          setSelected({ layerId: hit.layerId, featureId: hit.featureId });
          setSelection(new Set([buildKey(hit.layerId, hit.featureId)]));
        }
        setResult({ kind: 'point', hits: hit ? [hit] : [] });
        return;
      }
      if (shape.mode === 'area') {
        const hits = pickInArea(shape.points);
        setResult({ kind: 'area', summaries: queryInBbox(hits) });
        setSelection(new Set(hits.map((hi) => buildKey(hi.layerId, hi.featureId))));
        return;
      }
      if (shape.mode === 'transect') {
        const [a, b] = shape.points;
        setResult({ kind: 'transect', profile: computeTransect(a, b) });
      }
    }

    function step(event: DrawEvent): void {
      const out = reduce(stateRef.current, event);
      stateRef.current = out.state;
      setInFlight(out.state.shape);
      if (out.commit) commit(out.commit);
      if (event.type === 'setMode' || event.type === 'escape') setMode(out.state.mode);
    }

    function onClick(e: MapMouseEvent): void {
      if (stateRef.current.mode === 'none') return;
      e.preventDefault();
      step({ type: 'click', lngLat: [e.lngLat.lng, e.lngLat.lat] });
    }
    function onDoubleClick(e: MapMouseEvent): void {
      if (stateRef.current.mode !== 'area') return;
      e.preventDefault();
      step({ type: 'doubleClick' });
    }
    function onKey(ev: KeyboardEvent): void {
      if (ev.key === 'Escape' && stateRef.current.mode !== 'none') step({ type: 'escape' });
    }

    map.on('click', onClick);
    map.on('dblclick', onDoubleClick);
    window.addEventListener('keydown', onKey);
    return () => {
      map.off('click', onClick);
      map.off('dblclick', onDoubleClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [map, overlay, setMode, setInFlight, setCommitted, setResult, setSelection, setInspected, setSelected]);

  // Render the ghost shapes as MapLibre-native layers (DEC-031: never touches
  // the Deck overlay the verticals own). Re-ensures after a basemap style
  // reload (which drops custom sources/layers).
  useEffect(() => {
    if (!map) return;
    const ensure = (): void => {
      if (map.getSource(GHOST_SRC)) return;
      map.addSource(GHOST_SRC, { type: 'geojson', data: EMPTY_FC });
      map.addLayer({ id: GHOST_FILL, type: 'fill', source: GHOST_SRC, filter: ['==', ['get', 'g'], 'poly'], paint: { 'fill-color': AMBER, 'fill-opacity': 0.22 } });
      map.addLayer({ id: GHOST_LINE, type: 'line', source: GHOST_SRC, filter: ['match', ['get', 'g'], ['line', 'poly'], true, false], paint: { 'line-color': AMBER, 'line-width': 2.5 } });
      map.addLayer({ id: GHOST_PTS, type: 'circle', source: GHOST_SRC, filter: ['==', ['get', 'g'], 'pt'], paint: { 'circle-radius': 5, 'circle-color': AMBER, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5 } });
    };
    const update = (): void => {
      try {
        ensure();
        (map.getSource(GHOST_SRC) as GeoJSONSource | undefined)?.setData(ghostCollection(inFlight, committed));
      } catch {
        /* style mid-reload; the styledata handler re-runs update */
      }
    };
    if (map.isStyleLoaded()) update();
    else map.once('styledata', update);
    map.on('styledata', update);
    return () => {
      map.off('styledata', update);
    };
  }, [map, inFlight, committed]);

  // Cancel any draw and tear down the ghost when this controller unmounts
  // (e.g. the user leaves the Inspect panel).
  useEffect(() => {
    if (!map) return;
    return () => {
      setMode('none');
      setInFlight(null);
      setCommitted(null);
      setResult(null);
      for (const id of [GHOST_FILL, GHOST_LINE, GHOST_PTS]) {
        try { if (map.getLayer(id)) map.removeLayer(id); } catch { /* gone */ }
      }
      try { if (map.getSource(GHOST_SRC)) map.removeSource(GHOST_SRC); } catch { /* gone */ }
    };
  }, [map, setMode, setInFlight, setCommitted, setResult]);

  return null;
}
