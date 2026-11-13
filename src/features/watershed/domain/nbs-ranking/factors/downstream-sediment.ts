import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const downstreamSedimentFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'downstream-sediment',
  label: 'Downstream sediment delivery',
  description:
    'Modelled sediment yield reaching the downstream coastal / reef receiving water from this ' +
    'watershed (t/yr). Higher means more reef-impact relief from upstream intervention.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: 't/yr',
  // WS-040 follow-up: useMassBalance now publishes per-watershed sediment
  // yield (A_t_ha_yr × area_ha), which the NbSPriorityPanel context-builder
  // surfaces on polygon.properties as `downstream_sediment_t_per_yr`. The
  // factor reads that here; falls back to A_t_ha_yr × area_ha computed
  // inline if the property isn't pre-populated.
  compute: (p) => {
    const cached = p.properties.downstream_sediment_t_per_yr;
    if (typeof cached === 'number' && Number.isFinite(cached)) return cached;
    const A = p.properties.A_t_ha_yr;
    if (typeof A !== 'number' || !Number.isFinite(A)) return null;
    // area_ha — we only have access here through feature.geometry, but the
    // pure factor signature stays sync. The NbSPriorityPanel computes the
    // area-weighted value as the canonical path; this fallback returns
    // just A as a relative-magnitude proxy when the cached field is absent.
    return A;
  },
};

registerFactor(downstreamSedimentFactor);
