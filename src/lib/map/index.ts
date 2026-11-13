// src/lib/map/index.ts
// Map Engine public API. Other sub-systems import from '@/lib/map'.

export { MapView } from './core/MapView';
export { useMap, useDeckOverlay } from './core/useMap';
export { MapProvider, useMapContext } from './core/MapContext';
export { BASEMAPS, type BasemapId } from './core/styles';
export * from './core/constants';
export * from './layers/types';
export { useMapEngine, type MapEngineApi } from './core/useMapEngine';
export { MapEngineProvider } from './core/MapEngineProvider';
export {
  useSiteNavigation,
  useAutoFitActiveSite,
  shouldFitSite,
  computePadding,
  FLY_TO_DURATION_MS,
  FIT_DURATION_MS,
  DEFAULT_PADDING_RATIO,
  type SiteNavigationApi,
  type FitOptions,
} from './core/useSiteNavigation';
export { MapCoordinates, type MapCoordinatesProps } from './core/MapCoordinates';
export {
  metersPerPixel,
  chooseNiceDistance,
  computeScaleBar,
  formatDistance,
} from './core/scaleBar';
export { useExport, type ExportApi } from './export/useExport';
export {
  median,
  percentile,
  summarizeFrames,
  recordFrames,
  readHeap,
  evaluate,
  PERF_TARGETS,
  type FrameReport,
  type HeapReport,
  type PerfVerdict,
} from './perf/perfMetrics';
export {
  csvEscape,
  featuresToCsv,
  featuresToGeoJson,
  buildFilename,
  downloadBlob,
  LayerNotExportableError,
  type FilenameParts,
} from './export/exportFormats';
export { interpretMaplibreStyle, isMaplibreLayer, interpretDeckProps } from './layers/styleInterpret';
export { buildDeckLayer, isDeckLayerCfg } from './layers/deckLayers';
export { buildKey, parseKey, toggleKey } from './interaction/selectionKey';
export {
  reduce as reduceDraw,
  initialState as drawInitialState,
  type DrawState,
  type DrawEvent,
} from './interaction/drawStateMachine';
export {
  queryAt,
  queryInBbox,
  queryAlongLine,
  numericStats,
  sampleLine,
  haversineKm,
} from './interaction/queries';
export { PlaybackController, BASE_TICK_MS } from './interaction/PlaybackController';
export {
  legendFromStyle,
  rgbToCss,
  type LegendSpec,
  type GraduatedLegend as GraduatedLegendSpec,
  type CategoricalLegend as CategoricalLegendSpec,
  type ContinuousLegend as ContinuousLegendSpec,
  type NoneLegend as NoneLegendSpec,
} from './legends/legendFromStyle';
