import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const suitableElevFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'suitable-elev',
  label: 'Suitable elevation share',
  description:
    'Share of the watershed within the elevation band suitable for the target intervention ' +
    '(typically mangrove restoration: 0 to ~2 m above sea level). Higher means more of the ' +
    'watershed is physically restorable.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: '0..1',
  compute: (p) => {
    const raw = p.properties.Suitable_Elev_Pct;
    if (typeof raw !== 'number' || !Number.isFinite(raw)) return null;
    // mimes-nbs-scores publishes Suitable_Elev_Pct in percent (0..100); the
    // ranking factor wants a 0..1 fraction.
    return raw / 100;
  },
};

registerFactor(suitableElevFactor);
