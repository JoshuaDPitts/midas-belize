import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const rFactorFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'r-factor',
  label: 'Rainfall erosivity (R)',
  description:
    'Mean annual GloREDa R-factor over the watershed polygon. Higher means more rainfall-driven ' +
    'erosion pressure, so higher prioritises this watershed for NbS intervention.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: 'MJ·mm·ha⁻¹·h⁻¹·yr⁻¹',
  // Originally planned as a stub until the R-factor raster joined per
  // polygon, but the rusle-factors ETL (commit 0da1c46) publishes
  // `mean_r_factor` on every Belize watershed, so this is live data.
  compute: (p) =>
    typeof p.properties.mean_r_factor === 'number' && Number.isFinite(p.properties.mean_r_factor)
      ? (p.properties.mean_r_factor as number)
      : null,
};

registerFactor(rFactorFactor);
