'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { GeoJsonLayer } from '@deck.gl/layers';
import { bbox } from '@turf/turf';
import type { Feature, FeatureCollection } from 'geojson';
import type { Layer } from '@deck.gl/core';
import {
  activeSiteAtom,
  activeScenarioAtom,
  watershedEncodingAtom,
  selectedPolygonAtom,
  hoveredPolygonAtom,
  inspectedFeatureAtom,
  exportableFeaturesAtom,
  selectionAtom,
  swipeWatershedAtom,
  rfactorMonthAtom,
  layerOpacityAtom,
  erosionHotspotEnabledAtom,
  drawModeAtom,
  type WatershedEncodingMode,
  type SelectedPolygonRef,
} from '@/atoms';
import { useDeckOverlay, useMap } from '@/lib/map';
import { buildKey } from '@/lib/map/interaction/selectionKey';
import { handlePolygonClick } from '@/features/_shared/handlePolygonClick';
import { useRFactorForMonth } from '@/lib/data/hooks/useRFactorForMonth';
import { useLayerData } from '@/lib/data/hooks/useLayerData';
import { buildRFactorLayer, OVERLAY_LAYER_ID as RFACTOR_LAYER_ID, DEFAULT_OPACITY as RFACTOR_DEFAULT_OPACITY } from './RFactorRasterOverlay';
import { useRFactorTimelineSync } from './useRFactorTimelineSync';
import {
  buildFlowDirectionLayer,
  type FlowVectorPayload,
} from './FlowDirectionArrows';
import { buildErosionHotspotLayer } from './ErosionHotspotHeatmap';
import { buildScenarioDeltaLayer } from './ScenarioDeltaLayer';
import { useScenarioImpact } from '@/lib/data/hooks/useScenarioImpact';
import { useWatershedsForSite, type WatershedJoinedRow } from '@/lib/data';
import {
  nbsEncoder,
  restorationEncoder,
  erosionRiskEncoder,
  cladeIndexRgba,
  type RGBA,
} from './encoders';
import {
  useWatershedEbinCladePerPolygon,
  type AggregatedCladeRow,
} from './useWatershedEbinCladePerPolygon';
import {
  indexJoinedRows,
  polygonKeyOf,
} from '../data/findWatershedFeature';

const FALLBACK_GRAY: RGBA = [120, 120, 120, 180];

function makeCladeEncoder(lookup: Map<string, AggregatedCladeRow>) {
  return (props: Record<string, unknown>): RGBA => {
    const rawKey = props.Name ?? props.WATERSHED ?? props.MIMES_ID;
    if (rawKey === undefined || rawKey === null || rawKey === '') return FALLBACK_GRAY;
    const row = lookup.get(String(rawKey).replace(/\.0+$/, ''));
    if (!row) return FALLBACK_GRAY;
    return cladeIndexRgba(row.dominantClade);
  };
}

function mergeJoinedAttrs(
  geometry: FeatureCollection | null,
  joined: { nbs: WatershedJoinedRow[]; clade: WatershedJoinedRow[] } | null,
): FeatureCollection | null {
  if (!geometry) return null;
  if (!joined) return geometry;
  const byKey = indexJoinedRows(joined.nbs);
  return {
    ...geometry,
    features: geometry.features.map((f) => {
      const key = polygonKeyOf((f.properties ?? {}) as Record<string, unknown>);
      const row = key !== null ? byKey.get(String(key).replace(/\.0+$/, '')) : undefined;
      if (!row) return f;
      return { ...f, properties: { ...f.properties, ...row } };
    }),
  };
}

/** Layer ids that the watershed vertical may surface a selection from:
 * the deck.gl in-map layer ('watershed-polygons'), plus the dataset ids
 * the WatershedPolygonFormatter inspect CTA writes when the user clicks
 * its "Open in Watershed analysis" button. */
const WATERSHED_LAYER_IDS = new Set([
  'watershed-polygons',
  'placencia-watershed-polygons',
  'cayecaulker-watershed-polygons',
  'watersheds-utm-shape',
]);

export function WatershedMapLayers() {
  const site = useAtomValue(activeSiteAtom);
  const encoding = useAtomValue(watershedEncodingAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const swipe = useAtomValue(swipeWatershedAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setInspected = useSetAtom(inspectedFeatureAtom);
  const setExportable = useSetAtom(exportableFeaturesAtom);
  const selection = useAtomValue(selectionAtom);
  const setSelection = useSetAtom(selectionAtom);
  const drawMode = useAtomValue(drawModeAtom);
  const overlay = useDeckOverlay();
  const map = useMap();
  const lastFitSiteRef = useRef<typeof site | 'unset'>('unset');
  const { geometry, joinedAttrs } = useWatershedsForSite(site);
  const { lookup: cladeLookup } = useWatershedEbinCladePerPolygon(site);
  const rfactorMonth = useAtomValue(rfactorMonthAtom);
  const opacityMap = useAtomValue(layerOpacityAtom);
  const { rasterUrl: rfactorRasterUrl, bounds: rfactorBounds } =
    useRFactorForMonth(rfactorMonth);
  useRFactorTimelineSync();
  const hovered = useAtomValue(hoveredPolygonAtom);
  const { data: flowVectors } = useLayerData<FlowVectorPayload>('watershed-flow-vectors');
  const hotspotEnabled = useAtomValue(erosionHotspotEnabledAtom);
  const scenarioId = useAtomValue(activeScenarioAtom);
  const { watershedDeltas } = useScenarioImpact(scenarioId);
  const scenarioActive = scenarioId !== null && scenarioId !== 'basecase' && watershedDeltas.size > 0;

  const merged = useMemo(
    () => mergeJoinedAttrs(geometry, joinedAttrs),
    [geometry, joinedAttrs],
  );

  useEffect(() => {
    if (!map || !merged || lastFitSiteRef.current === site) return;
    lastFitSiteRef.current = site;
    const bounds = bbox(merged) as [number, number, number, number];
    if (!bounds.every(Number.isFinite)) return;
    map.fitBounds(bounds, {
      padding: { top: 110, right: 120, bottom: 96, left: 520 },
      duration: 900,
    });
  }, [map, merged, site]);

  // Publish the rendered watershed polygon features for data export (MC-007).
  // `merged` is the joined-attrs geometry feeding the 'watershed-polygons'
  // GeoJsonLayer; the literal layerId matches the selection key the click
  // handler writes, so MapExportMenu's selection-narrowing aligns. Clears on
  // unmount / empty.
  useEffect(() => {
    const features = merged?.features;
    if (!features || features.length === 0) return;
    setExportable({ layerId: 'watershed-polygons', label: 'Watershed', features });
    return () => setExportable(null);
  }, [merged, setExportable]);

  const encoders = useMemo<Record<WatershedEncodingMode, (p: Record<string, unknown>) => RGBA>>(
    () => ({
      nbs: nbsEncoder,
      clade: makeCladeEncoder(cladeLookup),
      restoration: restorationEncoder,
      'erosion-risk': erosionRiskEncoder,
    }),
    [cladeLookup],
  );

  /** Resolve the selected feature against the merged collection regardless
   * of which layerId wrote `selectedPolygonAtom` (the deck.gl click handler
   * writes 'watershed-polygons'; the inspect-card CTA writes the dataset id
   * like 'placencia-watershed-polygons'). Both are valid for the watershed
   * vertical, so accept any known watershed id. */
  const selectedFeature = useMemo<Feature | null>(() => {
    if (!merged || !selected) return null;
    if (!WATERSHED_LAYER_IDS.has(selected.layerId)) return null;
    const target = String(selected.featureId).replace(/\.0+$/, '');
    for (const f of merged.features) {
      const key = polygonKeyOf((f.properties ?? {}) as Record<string, unknown>);
      if (key !== null && String(key).replace(/\.0+$/, '') === target) {
        return f;
      }
    }
    return null;
  }, [merged, selected]);

  const compareFeatures = useMemo(() => {
    if (!merged) return { left: null as Feature | null, right: null as Feature | null };
    const findById = (id: string | number | null): Feature | null => {
      if (id === null) return null;
      const target = String(id).replace(/\.0+$/, '');
      return merged.features.find((f) => {
        const key = polygonKeyOf((f.properties ?? {}) as Record<string, unknown>);
        return key !== null && String(key).replace(/\.0+$/, '') === target;
      }) ?? null;
    };
    return { left: findById(swipe.left), right: findById(swipe.right) };
  }, [merged, swipe.left, swipe.right]);

  const layers = useMemo(() => {
    if (!merged) return [];
    const baseLayers: Layer[] = [
      new GeoJsonLayer({
        id: 'watershed-polygons',
        data: merged,
        pickable: true,
        stroked: true,
        filled: true,
        // Dim the base polygons when the WS-030 hotspot heatmap or the
        // WS-038 scenario-delta choropleth is active — the overlaid layer
        // becomes the dominant visual.
        opacity: hotspotEnabled || scenarioActive ? 0.4 : 1,
        getFillColor: (f: Feature) => {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const key = polygonKeyOf(props);
          if (key !== null && selection.has(buildKey('watershed-polygons', key))) {
            return [255, 255, 255, 230] as RGBA;
          }
          return encoders[encoding](props);
        },
        getLineColor: [60, 60, 60, 180] as RGBA,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        updateTriggers: {
          getFillColor: [encoding, cladeLookup, selection],
        },
        onHover: ({ object }) => {
          // MapboxOverlay runs `interleaved: true` (MapView.tsx), so MapLibre
          // owns the canvas cursor and resets inline cursor to `grab` on
          // every mousemove. Toggle a data-attribute on the maplibre-map
          // container; globals.css has a `cursor: pointer !important` rule
          // gated on that attribute, which beats MapLibre's normal inline
          // assignment.
          const container =
            typeof document !== 'undefined'
              ? document.querySelector('.maplibregl-map')
              : null;
          if (!object) {
            setHovered(null);
            if (container) (container as HTMLElement).removeAttribute('data-pickable-hover');
            return;
          }
          if (container) (container as HTMLElement).setAttribute('data-pickable-hover', 'true');
          const key = polygonKeyOf(((object as Feature).properties ?? {}) as Record<string, unknown>);
          if (key === null) return;
          setHovered({ layerId: 'watershed-polygons', featureId: key } as SelectedPolygonRef);
        },
        onClick: ({ object, coordinate }, event) => {
          if (!object) return;
          if (drawMode !== 'none') return; // draw tools own clicks while armed (MC-005)
          const props = ((object as Feature).properties ?? {}) as Record<string, unknown>;
          const key = polygonKeyOf(props);
          if (key === null) return;
          handlePolygonClick({
            ref: { layerId: 'watershed-polygons', featureId: key },
            properties: props,
            coordinate,
            shiftKey: Boolean(
              (event as { srcEvent?: { shiftKey?: boolean } } | undefined)?.srcEvent?.shiftKey,
            ),
            currentSelection: selection,
            setSelected,
            setInspected,
            setSelection,
          });
        },
      }),
    ];

    const compareLayerSpecs = [
      {
        id: 'watershed-compare-left',
        feature: compareFeatures.left,
        color: [0, 150, 136, 235] as RGBA,
        fill: [0, 150, 136, 45] as RGBA,
      },
      {
        id: 'watershed-compare-right',
        feature: compareFeatures.right,
        color: [255, 193, 7, 235] as RGBA,
        fill: [255, 193, 7, 45] as RGBA,
      },
    ];
    for (const spec of compareLayerSpecs) {
      if (!spec.feature) continue;
      baseLayers.push(
        new GeoJsonLayer({
          id: spec.id,
          data: { type: 'FeatureCollection', features: [spec.feature] },
          pickable: false,
          stroked: true,
          filled: true,
          getFillColor: spec.fill,
          getLineColor: spec.color,
          lineWidthUnits: 'pixels' as const,
          getLineWidth: 4,
          parameters: { depthTest: false },
        }),
      );
    }

    // Selection ring layer — floats above all fills (depthTest off) so the
    // brand-teal outline is always visible regardless of which encoder
    // colours the base polygon underneath. Mirrors the Marine
    // 'marine-selection-ring' pattern.
    if (selectedFeature) {
      baseLayers.push(
        new GeoJsonLayer({
          id: 'watershed-selection-ring',
          data: { type: 'FeatureCollection', features: [selectedFeature] },
          pickable: false,
          stroked: true,
          filled: false,
          getLineColor: [40, 200, 200, 255] as RGBA,
          lineWidthUnits: 'pixels' as const,
          getLineWidth: 3,
          parameters: { depthTest: false },
        }),
      );
    }

    // R-factor month overlay (WS-026): mounted as a BitmapLayer when the
    // user has picked a month. Today the underlying raster is a COG so the
    // builder returns null + warns once; once a PNG / tile endpoint lands
    // it will return a real BitmapLayer and the user-facing month-pick
    // path lights up without further changes here.
    const rfactorLayer = buildRFactorLayer({
      month: rfactorMonth,
      rasterUrl: rfactorRasterUrl,
      bounds: rfactorBounds,
      opacity: opacityMap[RFACTOR_LAYER_ID] ?? RFACTOR_DEFAULT_OPACITY,
    });
    if (rfactorLayer) {
      // Insert below the polygon fills so polygons remain pickable.
      baseLayers.unshift(rfactorLayer);
    }

    // Flow-direction arrows (WS-029): degrades to null when the
    // watershed-flow-vectors dataset isn't published yet. Sits above the
    // polygons so arrows are visible on top of fills.
    const flowLayer = buildFlowDirectionLayer({
      data: flowVectors,
      selectedPolygonId: selected?.featureId ?? null,
      hoveredPolygonId: hovered?.featureId ?? null,
    });
    if (flowLayer) {
      baseLayers.push(flowLayer);
    }

    // Erosion-hotspot heatmap (WS-030): renders only when the user toggles
    // the pill on. Sits above polygons + arrows so the hotspots are the
    // dominant visual when active. The base polygons already dim via the
    // GeoJsonLayer opacity above.
    const hotspotLayer = buildErosionHotspotLayer({
      enabled: hotspotEnabled,
      geometry: merged,
    });
    if (hotspotLayer) {
      baseLayers.push(hotspotLayer);
    }

    // Scenario-delta choropleth (WS-038): renders only when a scenario is
    // active and the deltas Map is non-empty. Sits above the dimmed base
    // polygons so its diverging green/coral palette is the dominant read.
    const scenarioLayer = buildScenarioDeltaLayer({
      scenarioId,
      geometry: merged,
      watershedDeltas,
    });
    if (scenarioLayer) {
      baseLayers.push(scenarioLayer);
    }

    return baseLayers;
  }, [merged, encoding, encoders, cladeLookup, compareFeatures, selectedFeature, setHovered, setSelected, setInspected, selection, setSelection, drawMode, rfactorMonth, rfactorRasterUrl, rfactorBounds, opacityMap, flowVectors, selected, hovered, hotspotEnabled, scenarioId, watershedDeltas]);

  useEffect(() => {
    if (!overlay) return;
    overlay.setProps({ layers });
    return () => {
      overlay.setProps({ layers: [] });
      const container =
        typeof document !== 'undefined'
          ? (document.querySelector('.maplibregl-map') as HTMLElement | null)
          : null;
      container?.removeAttribute('data-pickable-hover');
    };
  }, [overlay, layers]);

  // Fallback hover reset: deck.gl's per-layer onHover sometimes doesn't fire
  // with `object: null` when the cursor moves from a polygon into empty
  // basemap space within the same frame. Listen for mousemove on the
  // maplibre canvas and clear the data-attribute whenever we land on empty
  // space (we re-set it in the per-layer onHover when the next pickable
  // feature is entered). mouseleave also clears it when the cursor leaves
  // the map entirely.
  useEffect(() => {
    if (!overlay) return;
    if (typeof document === 'undefined') return;
    const canvas = document.querySelector('.maplibregl-canvas') as HTMLElement | null;
    const container = document.querySelector('.maplibregl-map') as HTMLElement | null;
    if (!canvas || !container) return;
    const pickable = overlay as unknown as {
      pickObject?: (opts: { x: number; y: number; radius?: number }) => unknown;
    };
    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      const picked = pickable.pickObject?.({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        radius: 1,
      });
      if (!picked) container!.removeAttribute('data-pickable-hover');
    }
    function onLeave() {
      container!.removeAttribute('data-pickable-hover');
    }
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    return () => {
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
    };
  }, [overlay]);

  return null;
}
