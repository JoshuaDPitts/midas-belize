import { describe, it, expect } from 'vitest';
import { sumPerPolygon, siteTotals, globalMaxPerPolygon, polygonTotals, type CoralBiomassRow } from './useCoralBiomass';

// Synthetic fixture: 2 polygons x 3 species x 2 years x 4 run_ids.
// Biomass values are deliberately distinct per (run_id, year, polygon, species)
// so aggregation bugs (wrong scenario/year filtering, wrong sum) are caught.
const RUN_IDS: Array<{ run_id: CoralBiomassRow['run_id']; climate_scenario: 0 | 1; implement_plan: 0 | 1 }> = [
  { run_id: 'bc_norestore', climate_scenario: 0, implement_plan: 0 },
  { run_id: 'bc_restore', climate_scenario: 0, implement_plan: 1 },
  { run_id: 'cc_norestore', climate_scenario: 1, implement_plan: 0 },
  { run_id: 'cc_restore', climate_scenario: 1, implement_plan: 1 },
];
const SPECIES: Array<{ species_id: 1 | 2 | 3; species: string }> = [
  { species_id: 1, species: 'Acropora palmata' },
  { species_id: 2, species: 'Porites lobata' },
  { species_id: 3, species: 'Montastraea cavernosa' },
];
const POLYGONS = [1, 2];
const YEARS = [1, 2];

function buildRows(): CoralBiomassRow[] {
  const rows: CoralBiomassRow[] = [];
  for (const run of RUN_IDS) {
    for (const year of YEARS) {
      for (const polygon_id of POLYGONS) {
        for (const sp of SPECIES) {
          // Deterministic, distinguishable value per combination.
          const biomass =
            run.climate_scenario * 1000 +
            run.implement_plan * 500 +
            year * 100 +
            polygon_id * 10 +
            sp.species_id;
          rows.push({
            run_id: run.run_id,
            climate_scenario: run.climate_scenario,
            implement_plan: run.implement_plan,
            sim_day: year * 365,
            year,
            polygon_id,
            species_id: sp.species_id,
            species: sp.species,
            biomass,
          });
        }
      }
    }
  }
  return rows;
}

const rows = buildRows();

describe('sumPerPolygon', () => {
  it('sums the 3 species for the requested (climate, plan, year) scenario', () => {
    const result = sumPerPolygon(rows, 0, 0, 1);
    // bc_norestore, year 1: climate=0, plan=0
    // polygon 1: species (1+10+1=? ) recompute: base = 0*1000+0*500+1*100=100; +polygon*10 +species
    const expectedPolygon1 = (100 + 10 + 1) + (100 + 10 + 2) + (100 + 10 + 3);
    const expectedPolygon2 = (100 + 20 + 1) + (100 + 20 + 2) + (100 + 20 + 3);
    expect(result.get(1)).toBe(expectedPolygon1);
    expect(result.get(2)).toBe(expectedPolygon2);
  });

  it('excludes rows from other scenarios and years', () => {
    const result = sumPerPolygon(rows, 1, 1, 2);
    // cc_restore, year 2: climate=1, plan=1 -> base = 1000+500+200=1700
    const expectedPolygon1 = (1700 + 10 + 1) + (1700 + 10 + 2) + (1700 + 10 + 3);
    expect(result.get(1)).toBe(expectedPolygon1);
    // Sanity: a different scenario/year must not leak in (would be much bigger/smaller).
    expect(result.get(1)).not.toBe(sumPerPolygon(rows, 0, 0, 1).get(1));
    expect(result.size).toBe(2);
  });
});

describe('sumPerPolygon — species selection', () => {
  it('isolates a single species (species_id) instead of summing all three', () => {
    // bc_norestore, year 1, climate=0 plan=0 -> base = 100
    const all = sumPerPolygon(rows, 0, 0, 1);
    const sp1 = sumPerPolygon(rows, 0, 0, 1, 1);
    const sp2 = sumPerPolygon(rows, 0, 0, 1, 2);
    const sp3 = sumPerPolygon(rows, 0, 0, 1, 3);
    // polygon 1: species value = base + polygon*10 + species_id
    expect(sp1.get(1)).toBe(100 + 10 + 1);
    expect(sp2.get(1)).toBe(100 + 10 + 2);
    expect(sp3.get(1)).toBe(100 + 10 + 3);
    // The three single-species values must add back up to the 'all' sum.
    expect(sp1.get(1)! + sp2.get(1)! + sp3.get(1)!).toBe(all.get(1));
  });

  it("defaults to summing all species when species is omitted or 'all'", () => {
    expect(sumPerPolygon(rows, 0, 0, 1)).toEqual(sumPerPolygon(rows, 0, 0, 1, 'all'));
  });
});

describe('globalMaxPerPolygon — species selection', () => {
  it('scopes the color-domain max to a single species', () => {
    // Largest single-species value: cc_restore (base 1700), year 2, polygon 2, species 3.
    const expected = 1700 + 20 + 3;
    expect(globalMaxPerPolygon(rows, 3)).toBe(expected);
    // A single species max must be smaller than the summed-all max.
    expect(globalMaxPerPolygon(rows, 3)).toBeLessThan(globalMaxPerPolygon(rows, 'all'));
  });
});

describe('polygonTotals', () => {
  it('returns a per-year series for one polygon only, summed over species', () => {
    const p1 = polygonTotals(rows, 1, 0, 0); // polygon 1, bc_norestore
    expect(p1.map((r) => r.year)).toEqual([1, 2]);
    // year 1, bc_norestore, polygon 1: base 100 + polygon*10(=10) + species(1+2+3)
    expect(p1.find((r) => r.year === 1)?.total).toBe((100 + 10 + 1) + (100 + 10 + 2) + (100 + 10 + 3));
    // must equal sumPerPolygon's value for that polygon/scenario/year
    expect(p1.find((r) => r.year === 1)?.total).toBe(sumPerPolygon(rows, 0, 0, 1).get(1));
  });

  it('restricts to a single species when given one', () => {
    const p1sp2 = polygonTotals(rows, 1, 0, 0, 2);
    expect(p1sp2.find((r) => r.year === 1)?.total).toBe(100 + 10 + 2);
  });

  it('excludes other polygons', () => {
    const p2 = polygonTotals(rows, 2, 0, 0);
    expect(p2.find((r) => r.year === 1)?.total).toBe((100 + 20 + 1) + (100 + 20 + 2) + (100 + 20 + 3));
    expect(p2.find((r) => r.year === 1)?.total).not.toBe(polygonTotals(rows, 1, 0, 0).find((r) => r.year === 1)?.total);
  });
});

describe('siteTotals', () => {
  it('returns per-year totals (sum over all polygons and species) for one scenario', () => {
    const result = siteTotals(rows, 0, 1); // bc_restore
    expect(result).toHaveLength(2);
    const years = result.map((r) => r.year).sort((a, b) => a - b);
    expect(years).toEqual([1, 2]);

    // Manually compute year 1 total for bc_restore (climate=0, plan=1): base = 0+500+100=600
    const perPolygon = (100 + 500) + 10 + (1 + 2 + 3); // per polygon: base+polygon+sum(species ids)
    const year1Total = POLYGONS.reduce((acc, p) => acc + (600 + p * 10 + 1) + (600 + p * 10 + 2) + (600 + p * 10 + 3), 0);
    const found = result.find((r) => r.year === 1);
    expect(found?.total).toBe(year1Total);
    void perPolygon;
  });
});

describe('globalMaxPerPolygon', () => {
  it('returns the max summed per-polygon value across all scenarios and years', () => {
    const max = globalMaxPerPolygon(rows);
    // The largest values come from cc_restore (climate=1, plan=1), year 2, polygon 2.
    const base = 1 * 1000 + 1 * 500 + 2 * 100; // 1700
    const expectedMax = (base + 20 + 1) + (base + 20 + 2) + (base + 20 + 3);
    expect(max).toBe(expectedMax);
  });
});
