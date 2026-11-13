'use client';
/**
 * REQ-CO-007: CoastalMapLayers
 *
 * Resolution-aware polygon layer for the Coastal vertical. Reads
 * coastalResolutionAtom to select the geometry dataset, coastalEncodingAtom
 * to select the fill-color encoder, and activeScenarioAtom for delta
 * encoding. Click writes selectedPolygonAtom + inspectedFeatureAtom.
 * Viewport fits on site change.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { GeoJsonLayer } from '@deck.gl/layers';
import { bbox } from '@turf/turf';
import type { Feature, FeatureCollection } from 'geojson';
import type { Layer } from '@deck.gl/core';
import {
  activeSiteAtom,
  activeScenarioAtom,
  coastalResolutionAtom,
  coastalEncodingAtom,
  selectedPolygonAtom,
  hoveredPolygonAtom,
  inspectedFeatureAtom,
  exportableFeaturesAtom,
  selectionAtom,
  drawModeAtom,
  type CoastalEncodingMode,
  type SelectedPolygonRef,
} from '@/atoms';
import { useDeckOverlay, useMap } from '@/lib/map';
import { buildKey } from '@/lib/map/interaction/selectionKey';
import { handlePolygonClick } from '@/features/_shared/handlePolygonClick';
import { useCoastalForSite } from '@/lib/data/hooks/useCoastalForSite';
import { useCoastalVulnerability } from '@/lib/data/hooks/useCoastalVulnerability';
import {
  vulnerabilityEncoder,
  mangroveEncoder,
  scenarioDeltaEncoder,
} from './encoders';
import { findCoastalFeature } from '../data/findCoastalFeature';

type RGBA = [number, number, number, number];

/**
 * Derive the Deck.gl layer id for a given site + resolution combination.
 * Stable across renders — changing either argument will cause Deck.gl to
 * unmount the old layer and mount a new one (desired for dataset switches).
 *
 * Exported for unit testing (REQ-CO-007).
 */
export function getCoastalLayerId(
  site: string | null,
  resolution: string,
): string {
  return `coastal-polygons-${site ?? 'null'}-${resolution}`;
}

/** Layer ids that the coastal vertical may surface a selection from. */
const COASTAL_LAYER_IDS = new Set([
  'coastal-polygons-placencia-hires',
  'coastal-polygons-placencia-lores',
  'coastal-polygons-caye-caulker-hires',
  'coastal-polygons-caye-caulker-lores',
  'coastal-polygons-null-hires',
  'coastal-polygons-null-lores',
  // Dataset-id keys written by inspect-card CTAs
  'placencia-30polygons-shape',
  'placencia-coast-polygons',
  'cayecaulker-coast-polygons',
  'coast-polygons',
]);

const FALLBACK_GRAY: RGBA = [120, 120, 120, 180];

function mergeVulnerabilityAttrs(
  geometry: FeatureCollection | null,
  vulnerabilityMap: Map<string, number>,
): FeatureCollection | null {
  if (!geometry) return null;
  return {
    ...geometry,
    features: geometry.features.map((f) => {
      const id = f.properties?.Polygon_ID != null ? String(f.properties.Polygon_ID) : null;
      if (id === null) return f;
      const v = vulnerabilityMap.get(id);
      if (v === undefined) return f;
      return { ...f, properties: { ...(f.properties ?? {}), vulnerability: v } };
    }),
  };
}

export function CoastalMapLayers() {
  const site = useAtomValue(activeSiteAtom);
  const resolution = useAtomValue(coastalResolutionAtom);
  const encoding = useAtomValue(coastalEncodingAtom);
  const scenarioId = useAtomValue(activeScenarioAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setInspected = useSetAtom(inspectedFeatureAtom);
  const setExportable = useSetAtom(exportableFeaturesAtom);
  const selection = useAtomValue(selectionAtom);
  const drawMode = useAtomValue(drawModeAtom);
  const setSelection = useSetAtom(selectionAtom);
  const overlay = useDeckOverlay();
  const map = useMap();
  const lastFitSiteRef = useRef<typeof site | 'unset'>('unset');

  const { geometry } = useCoastalForSite(site, resolution);
  const { rankedPolygons } = useCoastalVulnerability(site, resolution);

  // Build vulnerability lookup: Polygon_ID → vulnerability score (0–1)
  const vulnerabilityMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of rankedPolygons) {
      m.set(p.id, p.vulnerability);
    }
    return m;
  }, [rankedPolygons]);

  // Merge vulnerability scores into geometry properties so the encoder has access
  const merged = useMemo(
    () => mergeVulnerabilityAttrs(geometry, vulnerabilityMap),
    [geometry, vulnerabilityMap],
  );

  // Fit viewport when the site changes
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

  // Build encoding function map
  const encoders = useMemo<Record<CoastalEncodingMode, (p: Record<string, unknown>) => RGBA>>(
    () => ({
      vulnerability: vulnerabilityEncoder,
      mangrove: mangroveEncoder,
      'scenario-delta': (props) => {
        // Merge scenario delta from scenarioId if available
        if (!scenarioId) return FALLBACK_GRAY;
        return scenarioDeltaEncoder(props);
      },
    }),
    [scenarioId],
  );

  const layerId = getCoastalLayerId(site, resolution);

  // Publish the rendered polygon features for data export (MC-007). `merged`
  // is the vulnerability-merged geometry that feeds the primary GeoJsonLayer;
  // `layerId` matches the selection key the click handler writes, so
  // MapExportMenu's selection-narrowing aligns. Clears on unmount / empty.
  useEffect(() => {
    const features = merged?.features;
    if (!features || features.length === 0) return;
    setExportable({ layerId, label: 'Coastal', features });
    return () => setExportable(null);
  }, [merged, layerId, setExportable]);

  // Resolve the selected feature from the merged geometry
  const selectedFeature = useMemo<Feature | null>(() => {
    if (!merged || !selected) return null;
    if (!COASTAL_LAYER_IDS.has(selected.layerId)) return null;
    return findCoastalFeature(merged, String(selected.featureId));
  }, [merged, selected]);

  const layers = useMemo<Layer[]>(() => {
    if (!merged) return [];
    const baseLayers: Layer[] = [
      new GeoJsonLayer({
        id: layerId,
        data: merged,
        pickable: true,
        stroked: true,
        filled: true,
        getFillColor: (f: Feature) => {
          const props = (f.properties ?? {}) as Record<string, unknown>;
          const id = props['Polygon_ID'] != null ? String(props['Polygon_ID']) : null;
          if (id !== null && selection.has(buildKey(layerId, id))) {
            return [255, 255, 255, 230] as RGBA;
          }
          return encoders[encoding](props);
        },
        getLineColor: [60, 60, 60, 180] as RGBA,
        getLineWidth: 1,
        lineWidthMinPixels: 1,
        updateTriggers: {
          getFillColor: [encoding, scenarioId, vulnerabilityMap, selection],
        },
        onHover: ({ object }) => {
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
          const id = ((object as Feature).properties?.Polygon_ID) ?? null;
          if (id === null) return;
          setHovered({ layerId, featureId: String(id) } as SelectedPolygonRef);
        },
        onClick: ({ object, coordinate }, event) => {
          if (!object) return;
          if (drawMode !== 'none') return; // draw tools own clicks while armed (MC-005)
          const props = ((object as Feature).properties ?? {}) as Record<string, unknown>;
          const id = props['Polygon_ID'] != null ? String(props['Polygon_ID']) : null;
          if (id === null) return;
          handlePolygonClick({
            ref: { layerId, featureId: id },
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

    // Selection ring — floats above all fills (depthTest off)
    if (selectedFeature) {
      baseLayers.push(
        new GeoJsonLayer({
          id: 'coastal-selection-ring',
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

    return baseLayers;
  }, [merged, layerId, encoding, encoders, scenarioId, vulnerabilityMap, selectedFeature, selection, drawMode, setHovered, setSelected, setInspected, setSelection]);

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

  // Fallback hover reset (same pattern as WatershedMapLayers)
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
