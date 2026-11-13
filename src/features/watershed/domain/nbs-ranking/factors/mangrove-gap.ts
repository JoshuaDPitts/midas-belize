import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const mangroveGapFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'mangrove-gap',
  label: 'Mangrove gap',
  description:
    'How much suitable area is NOT already covered by mangrove (1 - existing mangrove fraction). ' +
    'Higher means more room to plant — the gap-filling opportunity.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: '0..1',
  compute: (p) => {
    const raw = p.properties.Mangrove_Pct_Total;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    // mimes-nbs-scores publishes Mangrove_Pct_Total in percent (0..100).
    const fraction = raw / 100;
    return Math.max(0, Math.min(1, 1 - fraction));
  },
};

registerFactor(mangroveGapFactor);
