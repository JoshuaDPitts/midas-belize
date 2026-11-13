import type { MarineLayerConfigSpec, MarineSiteId } from './MarineMapLayers.types';

/**
 * Per-site marine map layer configs.
 *
 * Placencia / Caye Caulker point at the JOINED datasets (`*-nbs-scores`) whose
 * features carry geometry AND encoding props. Laughing Bird currently points at
 * the raw geometry dataset only (`laughing-bird-marine-polygons`); it renders
 * with the neutral per-family fallback fill until a joined biomass dataset is
 * wired (sub-project 2).
 */
export function buildLayerConfigsForSite(site: MarineSiteId | null): MarineLayerConfigSpec[] {
  if (site === 'placencia') {
    return [
      { datasetId: 'placencia-marine-nbs-scores', family: 'marine-polygons' },
      { datasetId: 'placencia-coast-nbs-scores', family: 'coast-polygons' },
      { datasetId: 'placencia-30polygons-nbs-scores', family: 'polygon-grid' },
    ];
  }
  if (site === 'caye-caulker') {
    return [
      { datasetId: 'cayecaulker-marine-nbs-scores', family: 'marine-polygons' },
      { datasetId: 'cayecaulker-coast-nbs-scores', family: 'coast-polygons' },
      { datasetId: 'cayecaulker-site', family: 'polygon-grid' },
    ];
  }
  if (site === 'laughing-bird') {
    return [{ datasetId: 'laughing-bird-marine-polygons', family: 'marine-polygons' }];
  }
  return [];
}
