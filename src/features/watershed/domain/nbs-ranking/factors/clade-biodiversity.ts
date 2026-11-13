import { registerFactor } from '../_register';
import type { NbsRankFactor, WatershedPolygonContext } from '../_types';

/** Pure Shannon-Wiener diversity index: H = -Σ(p_i * ln(p_i)) over the
 * non-zero clade fractions. Higher H means more even / diverse clade mix;
 * a monoculture has H = 0. */
export function shannonIndex(fractions: number[]): number {
  let sum = 0;
  let total = 0;
  for (const f of fractions) {
    if (typeof f === 'number' && Number.isFinite(f) && f > 0) {
      sum += f;
      total += 1;
    }
  }
  if (sum <= 0 || total === 0) return 0;
  let H = 0;
  for (const f of fractions) {
    if (typeof f !== 'number' || !Number.isFinite(f) || f <= 0) continue;
    const p = f / sum; // normalise in case fractions don't sum to 1
    H += -p * Math.log(p);
  }
  return H;
}

export const cladeBiodiversityFactor: NbsRankFactor<WatershedPolygonContext> = {
  id: 'clade-biodiversity',
  label: 'Clade biodiversity (Shannon)',
  description:
    'Shannon diversity index across mangrove clade fractions present in this watershed. Higher ' +
    'means a more even distribution of clades, which is a coarse proxy for ecological resilience.',
  defaultWeight: 0.5,
  direction: 'higher-better',
  unit: 'H',
  compute: (p) => {
    // The WS-024 NbSPriorityPanel merges per-polygon clade fractions into
    // the property bag under `clade_fractions` (Record<cladeIdx, fraction>)
    // before calling computeRanking. Direct CSV columns (Clade_N_pct) are
    // also accepted as a fallback for fixture / mimes-nbs-scores rows that
    // already carry them.
    const fractions: number[] = [];
    const cf = p.properties.clade_fractions as Record<string, number> | undefined;
    if (cf && typeof cf === 'object') {
      for (const v of Object.values(cf)) {
        if (typeof v === 'number' && Number.isFinite(v)) fractions.push(v);
      }
    }
    if (fractions.length === 0) {
      for (let i = 1; i <= 25; i++) {
        const v = p.properties[`Clade_${i}_pct`];
        if (typeof v === 'number' && Number.isFinite(v)) fractions.push(v);
      }
    }
    if (fractions.length === 0) return null;
    const H = shannonIndex(fractions);
    return Number.isFinite(H) ? H : null;
  },
};

registerFactor(cladeBiodiversityFactor);
