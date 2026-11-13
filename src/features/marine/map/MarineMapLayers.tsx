'use client';
import { useEffect, useMemo, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { GeoJsonLayer } from '@deck.gl/layers';
import {
  activeSiteAtom,
  effectiveMarineEncodingAtom,
  hoveredPolygonAtom,
  selectedPolygonAtom,
  inspectedFeatureAtom,
  exportableFeaturesAtom,
  selectionAtom,
  drawModeAtom,
  coralClimateAtom,
  coralPlanAtom,
  coralYearAtom,
  coralSpeciesAtom,
  coralPopupAtom,
  type SelectedPolygonRef,
} from '@/atoms';
import { useDeckOverlay } from '@/lib/map';
import { buildKey } from '@/lib/map/interaction/selectionKey';
import { handlePolygonClick } from '@/features/_shared/handlePolygonClick';
import { usePolygonGeoJson, type MarinePolygonFeature, type MarinePolygonProps } from './usePolygonGeoJson';
import { useSiteEncodingRange } from './useSiteEncodingRange';
import { nbsToRgba } from './nbsColorScale';
import { cladeIndexRgba } from './cladeColorScale';
import { restorationToRgba } from './restorationColorScale';
import { biomassToRgba } from './biomassColorScale';
import { useEbinCladePerPolygon, type MarineSite, type CladeLookupByFamily } from './useEbinCladePerPolygon';
import { useCoralBiomass } from '@/features/marine/domain/useCoralBiomass';
import type { MarineLayerConfigSpec, MarineSiteId } from './MarineMapLayers.types';
import { buildLayerConfigsForSite } from './buildLayerConfigsForSite';

// Re-exported so existing consumers (useMarineSiteAggregate, MarineHeroPanel,
// REQ-MA-014 test) that import it from this module keep working after the
// function was extracted into ./buildLayerConfigsForSite.
export { buildLayerConfigsForSite } from './buildLayerConfigsForSite';

// Maximum polygon layer slots per site (always 3).
// Hooks must be called unconditionally; we use fixed slots and
// treat null datasetId as a no-op inside usePolygonGeoJson.

// Per-family base colors — used when a polygon doesn't have the encoding
// data the active encoder is looking for (NbS_Score / Restoration_Potential /
// Clade_*_pct). Distinct colors per layer family let the user see WHICH layer
// each polygon belongs to instead of a uniform gray sea. OKLCH viz tokens:
//   marine-polygons → viz-8 ocean    (offshore water)
//   coast-polygons  → viz-7 terra    (coastal land)
//   polygon-grid    → viz-1 teal     (analysis grid)
// Alpha is set to ~90/255 (35%) so labels behind the polygons stay legible.
const FAMILY_FALLBACK: Record<MarineLayerConfigSpec['family'], [number, number, number, number]> = {
  'marine-polygons': [80, 162, 220, 90],
  'coast-polygons': [232, 134, 74, 90],
  'polygon-grid': [56, 204, 184, 70],
};

function hasEncodingData(
  props: Record<string, unknown>,
  encoding: 'nbs' | 'restoration',
): boolean {
  if (encoding === 'nbs') return typeof props.NbS_Score === 'number';
  return typeof props.Restoration_Potential === 'number';
}

function polygonKeyOf(props: Record<string, unknown>): string | null {
  const raw =
    (props.MIMES_ID as string | number | undefined) ??
    (props.mimes_id as string | number | undefined) ??
    (props.id as string | number | undefined) ??
    (props.ID as string | number | undefined) ??
    (props.GRID_ID as string | undefined) ??
    (props.Name as string | undefined);
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw).replace(/\.0+$/, '');
}

export function MarineMapLayers() {
  const activeSite = useAtomValue(activeSiteAtom);
  // effectiveMarineEncodingAtom reconciles the persisted global
  // marineEncodingAtom with the Laughing Bird special case (biomass-only
  // site) so the map fill and MapLegend never diverge on the active
  // encoding. See src/atoms/index.ts.
  const encoding = useAtomValue(effectiveMarineEncodingAtom);
  const selected = useAtomValue(selectedPolygonAtom);
  const setHovered = useSetAtom(hoveredPolygonAtom);
  const setSelected = useSetAtom(selectedPolygonAtom);
  const setInspected = useSetAtom(inspectedFeatureAtom);
  const setExportable = useSetAtom(exportableFeaturesAtom);
  const selection = useAtomValue(selectionAtom);
  const setSelection = useSetAtom(selectionAtom);
  const drawMode = useAtomValue(drawModeAtom);
  const overlay = useDeckOverlay();

  const configs = useMemo(
    () => buildLayerConfigsForSite(activeSite as MarineSiteId | null),
    [activeSite],
  );

  // Unconditional hook calls — one per fixed slot (max 3 per site).
  // usePolygonGeoJson(null) is a no-op returning { data: undefined }.
  const geo0 = usePolygonGeoJson(configs[0]?.datasetId ?? null);
  const geo1 = usePolygonGeoJson(configs[1]?.datasetId ?? null);
  const geo2 = usePolygonGeoJson(configs[2]?.datasetId ?? null);

  const geos = useMemo(() => [geo0, geo1, geo2], [geo0, geo1, geo2]);

  // Per-family lookup: dominant clade for each polygon, aggregated across BIN_IDs
  // from the `*-ebin-clade-detail` datasets. The clade columns aren't carried on
  // the `*-nbs-scores` joined geometry, so we fetch the ebin datasets separately
  // and reduce per polygon. Returns empty maps when site is null.
  const cladeLookup = useEbinCladePerPolygon(
    typeof activeSite === 'string' && (activeSite === 'placencia' || activeSite === 'caye-caulker')
      ? (activeSite as MarineSite)
      : null,
  );

  // Coral biomass scenario lookup (LBD scenario viz). Always called
  // unconditionally (rules-of-hooks); the underlying SWR fetch is cheap to
  // leave mounted for non-Laughing-Bird sites since getFill only reads it
  // in the 'biomass' branch.
  const coralClimate = useAtomValue(coralClimateAtom);
  const coralPlan = useAtomValue(coralPlanAtom);
  const coralYear = useAtomValue(coralYearAtom);
  const coralSpecies = useAtomValue(coralSpeciesAtom);
  const setCoralPopup = useSetAtom(coralPopupAtom);
  const { perPolygon: coralPerPolygon, years: coralYears, maxBiomassFor } = useCoralBiomass();
  const effectiveCoralYear = coralYear ?? (coralYears.length > 0 ? Math.max(...coralYears) : null);
  // Color-domain max tracks the active species selection so an isolated
  // species map uses the full pale→teal ramp instead of washing out against
  // the summed-total domain.
  const maxForMode = maxBiomassFor(coralSpecies);
  const biomassMap = useMemo(
    () => (effectiveCoralYear === null
      ? new Map<number, number>()
      : coralPerPolygon(coralClimate, coralPlan, effectiveCoralYear, coralSpecies)),
    [coralPerPolygon, coralClimate, coralPlan, effectiveCoralYear, coralSpecies],
  );

  const allActiveFeatures: MarinePolygonFeature[] = useMemo(() => {
    return configs
      .map((cfg, i) => ({ cfg, geo: geos[i] }))
      .filter(({ geo }) => geo?.data)
      .flatMap(({ geo }) => geo.data!.features as MarinePolygonFeature[]);
  }, [configs, geos]);

  const range = useSiteEncodingRange(allActiveFeatures, encoding);

  // Publish the primary polygon layer's features for data export (MC-007).
  // The marine vertical renders up to 3 polygon families; the primary is the
  // first config with non-empty data (the marine-polygons family — the
  // offshore site polygons the user inspects). `cfg.datasetId` is used as the
  // layerId because that's the selection key the click handler writes, so
  // MapExportMenu's selection-narrowing aligns. Clears on unmount / empty.
  const primaryExport = useMemo(() => {
    for (let i = 0; i < configs.length; i++) {
      const cfg = configs[i];
      const data = geos[i]?.data;
      if (cfg && data && data.features.length > 0) {
        return { layerId: cfg.datasetId, features: data.features };
      }
    }
    return null;
  }, [configs, geos]);

  useEffect(() => {
    if (!primaryExport) return;
    setExportable({
      layerId: primaryExport.layerId,
      label: 'Marine',
      features: primaryExport.features,
    });
    return () => setExportable(null);
  }, [primaryExport, setExportable]);

  // Helper: resolve the selected feature across all fetched configs.
  const fetched = useMemo(
    () => configs
      .map((cfg, i) => ({ cfg, geo: geos[i] }))
      .filter(({ geo }) => geo?.data)
      .map(({ cfg, geo }) => ({ datasetId: cfg.datasetId, geo })),
    [configs, geos],
  );

  function findSelectedFeature(sel: SelectedPolygonRef | null): MarinePolygonFeature | null {
    if (!sel) return null;
    const matchConfig = fetched.find((f) => f.datasetId === sel.layerId);
    if (!matchConfig?.geo.data) return null;
    return (
      matchConfig.geo.data.features.find((feat) => {
        const props = (feat as MarinePolygonFeature).properties as Record<string, unknown>;
        return polygonKeyOf(props) === String(sel.featureId);
      }) as MarinePolygonFeature | undefined
    ) ?? null;
  }

  const layers = useMemo(() => {
    const baseLayers = configs
      .map((cfg, i) => ({ cfg, geo: geos[i] }))
      .filter(({ geo }) => geo?.data)
      .map(({ cfg, geo }) => {
        const data = geo.data!;
        const familyClades: CladeLookupByFamily[typeof cfg.family] = cladeLookup.byFamily[cfg.family];
        // GeoJsonLayer<P> passes Feature<Geometry, P> to accessors.
        // When the encoding property is missing (e.g., the csv-polygon-join
        // produced 0 matches — see DEC-026 / Track H follow-up), substitute a
        // per-family base color so the 3 layers stay visually distinguishable
        // instead of all rendering as the same neutral hatch gray.
        const getFill = (feat: { properties: MarinePolygonProps | null }): [number, number, number, number] => {
          const props = (feat.properties ?? {}) as Record<string, unknown>;
          // Use the SAME canonical, unique key the click/hover handlers write
          // (polygonKeyOf → mimes_id). The Laughing Bird geometry carries a
          // non-unique `ID` cluster field (8 distinct values across 43
          // polygons); deriving the selection id from it painted every polygon
          // in the clicked cluster. mimes_id (1..43) is 1:1 per feature.
          const fid = polygonKeyOf(props);
          if (fid !== null && selection.has(buildKey(cfg.datasetId, fid))) {
            return [255, 255, 255, 230];
          }
          if (encoding === 'clade') {
            const key = polygonKeyOf(props);
            const agg = key !== null ? familyClades.get(key) : undefined;
            if (!agg || agg.dominantClade === null) return FAMILY_FALLBACK[cfg.family];
            return cladeIndexRgba(agg.dominantClade);
          }
          if (encoding === 'biomass') {
            const key = polygonKeyOf(props);
            // Geometry carries mimes_id as a STRING ("1".."43"); the biomass
            // perPolygon map is keyed by NUMBER polygon_id 1..43 — Number()
            // bridges the two id spaces.
            const v = key !== null ? biomassMap.get(Number(key)) : undefined;
            if (v == null) return FAMILY_FALLBACK[cfg.family];
            return biomassToRgba(v, maxForMode);
          }
          if (!hasEncodingData(props, encoding)) {
            return FAMILY_FALLBACK[cfg.family];
          }
          if (encoding === 'nbs') return nbsToRgba(props.NbS_Score as number, range);
          return restorationToRgba(props.Restoration_Potential as number, range);
        };
        return new GeoJsonLayer<MarinePolygonProps>({
          id: `marine-${cfg.datasetId}`,
          data,
          pickable: true,
          stroked: true,
          filled: true,
          getFillColor: getFill,
          getLineColor: [0, 0, 0, 100],
          lineWidthMinPixels: 1,
          autoHighlight: true,
          highlightColor: [255, 255, 255, 60],
          // Without updateTriggers, deck.gl caches accessor outputs and
          // ignores closure changes — so flipping NBS → RESTORATION created
          // new layer instances with new getFill closures but deck.gl kept
          // serving the cached fill colors. Discovered 2026-05-13.
          // familyClades (clade-lookup map identity) is included so a freshly-
          // fetched ebin-clade-detail dataset retriggers the fill colors.
          // biomassMap (identity) + coralClimate/coralPlan/effectiveCoralYear
          // are included for the same reason: flipping scenario/year controls
          // produces a new biomassMap but the same getFill closure shape, so
          // without these deck.gl would keep serving stale cached fills.
          updateTriggers: {
            getFillColor: [
              encoding,
              range.min,
              range.max,
              cfg.family,
              familyClades,
              selection,
              biomassMap,
              maxForMode,
              coralClimate,
              coralPlan,
              coralSpecies,
              effectiveCoralYear,
            ],
          },
          transitions: {
            getFillColor: { duration: 300, type: 'interpolation' },
          },
          onHover: ({ object }) => {
            // Pointer-cursor feedback: flag the map container so globals.css
            // swaps the canvas cursor to `pointer` over a pickable polygon
            // (same data-attribute pattern as CoastalMapLayers).
            const container =
              typeof document !== 'undefined' ? document.querySelector('.maplibregl-map') : null;
            if (!object) {
              setHovered(null);
              if (container) (container as HTMLElement).removeAttribute('data-pickable-hover');
              return;
            }
            if (container) (container as HTMLElement).setAttribute('data-pickable-hover', 'true');
            const props = object.properties as Record<string, unknown>;
            const featureId = polygonKeyOf(props);
            if (featureId === null) return;
            setHovered({ layerId: cfg.datasetId, featureId });
          },
          onClick: ({ object, coordinate }, event) => {
            if (!object) return;
            if (drawMode !== 'none') return; // draw tools own clicks while armed (MC-005)
            const props = object.properties as Record<string, unknown>;
            const featureId = polygonKeyOf(props);
            if (featureId === null) return;
            handlePolygonClick({
              ref: { layerId: cfg.datasetId, featureId },
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
            // Open the coral biomass popup only on the biomass-encoded site
            // (Laughing Bird). featureId is mimes_id, 1:1 with biomass polygon_id.
            if (encoding === 'biomass' && Array.isArray(coordinate)) {
              const polygonId = Number(featureId);
              if (Number.isFinite(polygonId)) {
                setCoralPopup({
                  featureId,
                  polygonId,
                  lngLat: [coordinate[0], coordinate[1]],
                });
              }
            }
          },
        });
      });

    // Selection ring — floats above all fill layers (depthTest off).
    const matchFeature = findSelectedFeature(selected);
    if (matchFeature) {
      baseLayers.push(
        new GeoJsonLayer({
          id: 'marine-selection-ring',
          data: { type: 'FeatureCollection', features: [matchFeature] } as { type: 'FeatureCollection'; features: MarinePolygonFeature[] },
          stroked: true,
          filled: false,
          getLineColor: [255, 255, 255, 230] as [number, number, number, number],
          lineWidthUnits: 'pixels' as const,
          getLineWidth: 3,
          parameters: { depthTest: false },
        }),
      );
    }

    return baseLayers;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, geos, encoding, range, setHovered, setSelected, setInspected, selected, selection, setSelection, drawMode, fetched, cladeLookup, biomassMap, maxForMode, coralClimate, coralPlan, coralSpecies, effectiveCoralYear, setCoralPopup]);

  // Camera-on-site-change is owned solely by `useAutoFitActiveSite`
  // (mounted app-wide via <MapAutoFitController/> in MapArea). This vertical
  // no longer snaps the camera itself — a redundant second fitter here just
  // duplicated the work and made the deep-link race harder to reason about.

  // NOTE: there used to be a "fly-to on selection" effect here that called
  // `map.fitBounds()` on the selected polygon's bbox whenever `selectedPolygonAtom`
  // changed. Removed: for small EBIN polygons (e.g. Laughing Bird) it zoomed in
  // hard and recentered jarringly on every click. Selecting a polygon now only
  // highlights it (selection-ring layer above) and opens the inspect panel —
  // both of which are driven by the `selected`/`inspected` atoms independently
  // of camera movement, so no zoom/pan side effect remains on click.

  // Register layers with the Deck.gl overlay. When overlay is null
  // (map not yet mounted, or in unit-test context), the effect is a no-op.
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

  // Fallback pointer-cursor reset: deck.gl's onHover(null) can miss fast
  // pointer exits, leaving the cursor stuck as a pointer. Poll picks on
  // mousemove and clear the flag when nothing is under the pointer (same
  // pattern as CoastalMapLayers / WatershedMapLayers).
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
