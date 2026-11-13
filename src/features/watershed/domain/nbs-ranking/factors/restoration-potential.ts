import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const restorationPotentialFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'restoration-potential',
  label: 'Restoration potential',
  description:
    'How much restoration impact this watershed could deliver. Higher means more potential. ' +
    'Sourced from the per-watershed NbS scoring CSV.',
  defaultWeight: 1.0,
  direction: 'higher-better',
  unit: '0..1',
  compute: (p) =>
    typeof p.properties.Restoration_Potential === 'number'
      ? p.properties.Restoration_Potential
      : null,
};

registerFactor(restorationPotentialFactor);
