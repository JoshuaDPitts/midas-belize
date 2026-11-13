// Public surface for the NbS ranking system.
//
// Factor registrations happen by side-effect: importing this barrel runs
// each factor module which calls `registerFactor` at module-load time.
// The NbSPriorityPanel reads the populated registry via
// `getRegisteredFactors()`.

export { registerFactor, getRegisteredFactors, clearFactors } from './_register';
export { computeRanking } from './computeRanking';
export type {
  NbsRankFactor,
  NbsFactorDirection,
  PerFactorContribution,
  RankedPolygon,
  WatershedPolygonContext,
} from './_types';

// Factor registrations (side-effect imports). WS-019..023 fill these in.
import './factors/restoration-potential';
import './factors/conservation-value';
import './factors/area';
import './factors/r-factor';
import './factors/suitable-elev';
import './factors/mangrove-gap';
import './factors/downstream-sediment';
import './factors/scenario-uplift';
import './factors/clade-biodiversity';
