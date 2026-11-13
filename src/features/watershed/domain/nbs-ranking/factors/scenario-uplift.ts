import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

export const scenarioUpliftFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'scenario-uplift',
  label: 'Scenario uplift (ΔNbS)',
  description:
    'How much the NbS score improves under the active restoration scenario vs. the baseline ' +
    'scenario. Higher means more intervention payoff per polygon.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: 'Δ NbS',
  // STUBBED — depends on `useScenarioImpact` (WS-033). When that hook
  // publishes the per-polygon ΔNbS, the factor flips to reading
  // p.properties.scenario_delta_nbs. The factor stays registered so the
  // customise-sliders UI shows it with a "needs upstream data" label.
  compute: (_p) => null,
};

registerFactor(scenarioUpliftFactor);
