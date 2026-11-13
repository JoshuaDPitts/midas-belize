import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const conservationValueFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'conservation-value',
  label: 'Conservation value',
  description:
    'How much existing ecological value this watershed already holds. Higher means stronger ' +
    'priority to protect what is already here.',
  defaultWeight: 1.0,
  direction: 'higher-better',
  unit: '0..1',
  compute: (p) =>
    typeof p.properties.Conservation_Value === 'number'
      ? p.properties.Conservation_Value
      : null,
};

registerFactor(conservationValueFactor);
