import { area as turfArea } from '@turf/turf';
import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const areaFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'area',
  label: 'Watershed area',
  description:
    'Log-scaled polygon area in km². Larger watersheds carry more downstream impact for the ' +
    'same per-hectare effort, so this factor rewards scale.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: 'log km²',
  compute: (p) => {
    try {
      const area_m2 = turfArea(p.feature);
      if (!Number.isFinite(area_m2) || area_m2 <= 0) return null;
      return Math.log(area_m2 / 1_000_000);
    } catch {
      return null;
    }
  },
};

registerFactor(areaFactor);
