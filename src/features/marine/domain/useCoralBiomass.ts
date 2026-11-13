'use client';
import { useMemo } from 'react';
import useSWR from 'swr';
import { dataFetcher } from '@/lib/data/cache/fetcher';
import type { CoralSpecies } from '@/atoms';

// SSP-2.5 variant: base case (climate 0) forced by SST "Placencia Mod 2.5"
// instead of observed, with corrected species names. The original
// observed-base dataset ('output-lb-coral-biomass-by-species-yearly') remains
// published for instant revert (just swap this id back).
export const CORAL_BIOMASS_DATASET_ID = 'output-lb-coral-biomass-by-species-yearly-ssp25';

export type CoralRunId = 'bc_norestore' | 'bc_restore' | 'cc_norestore' | 'cc_restore';

/** Species id → common+scientific label, resolved live from the dataset. */
export interface CoralSpeciesInfo {
  id: 1 | 2 | 3;
  name: string;
}

/**
 * Canonical species names, keyed by the model's species_id (1..3). The Simile
 * model only tracks species by index; the authoritative names come from the
 * model inputs (Corals Species attributes.csv, Mortality Cause.csv, Planting
 * scenarios.csv legend), which all agree on these three. An earlier export
 * mislabelled ids 2 and 3 as "Porites lobata" / "Montastraea cavernosa"; we
 * override the dataset's `species` string with this map so every surface (map,
 * legend, selector, chart, popup) stays consistent regardless of stale labels.
 */
export const CORAL_SPECIES_NAMES: Record<1 | 2 | 3, string> = {
  1: 'Acropora palmata',
  2: 'Acropora cervicornis',
  3: 'Orbicella spp.',
};

/** One tidy long-format row, values coerced to their natural types. */
export interface CoralBiomassRow {
  run_id: CoralRunId;
  climate_scenario: 0 | 1;
  implement_plan: 0 | 1;
  sim_day: number;
  year: number;
  polygon_id: number;
  species_id: 1 | 2 | 3;
  species: string;
  biomass: number;
}

/** Raw shape as returned by `/api/data/{id}`: every field is a string. */
interface RawCoralBiomassRow {
  run_id: string;
  climate_scenario: string;
  implement_plan: string;
  sim_day: string;
  year: string;
  polygon_id: string;
  species_id: string;
  species: string;
  biomass: string;
}

interface CoralBiomassApiResponse {
  dataset_id: string;
  row_count: number;
  columns: string[];
  rows: RawCoralBiomassRow[];
}

export interface CoralScenario {
  runId: CoralRunId;
  climate: 0 | 1;
  plan: 0 | 1;
  label: string;
}

export const CORAL_SCENARIOS: CoralScenario[] = [
  { runId: 'bc_norestore', climate: 0, plan: 0, label: 'SSP-2.5 / No restoration' },
  { runId: 'bc_restore', climate: 0, plan: 1, label: 'SSP-2.5 / Restoration' },
  { runId: 'cc_norestore', climate: 1, plan: 0, label: 'SSP-4.5 / No restoration' },
  { runId: 'cc_restore', climate: 1, plan: 1, label: 'SSP-4.5 / Restoration' },
];

function parseRow(raw: RawCoralBiomassRow): CoralBiomassRow {
  return {
    run_id: raw.run_id as CoralRunId,
    climate_scenario: Number(raw.climate_scenario) as 0 | 1,
    implement_plan: Number(raw.implement_plan) as 0 | 1,
    sim_day: Number(raw.sim_day),
    year: Number(raw.year),
    polygon_id: Number(raw.polygon_id),
    species_id: Number(raw.species_id) as 1 | 2 | 3,
    species: raw.species,
    biomass: Number(raw.biomass),
  };
}

/**
 * Biomass per polygon for one scenario (climate, plan) + year. `species`
 * defaults to `'all'` (sum of the 3 modelled species); a specific species_id
 * (1 | 2 | 3) isolates that species. Rows outside the scenario/year/species
 * are excluded.
 */
export function sumPerPolygon(
  rows: CoralBiomassRow[],
  climate: 0 | 1,
  plan: 0 | 1,
  year: number,
  species: CoralSpecies = 'all',
): Map<number, number> {
  const result = new Map<number, number>();
  for (const row of rows) {
    if (row.climate_scenario !== climate || row.implement_plan !== plan || row.year !== year) continue;
    if (species !== 'all' && row.species_id !== species) continue;
    result.set(row.polygon_id, (result.get(row.polygon_id) ?? 0) + row.biomass);
  }
  return result;
}

/**
 * Per-year total biomass for one scenario, summed over all polygons and, by
 * default, all species. Pass a `species` id (1 | 2 | 3) to restrict the series
 * to a single species. Sorted ascending by year.
 */
export function siteTotals(
  rows: CoralBiomassRow[],
  climate: 0 | 1,
  plan: 0 | 1,
  species: CoralSpecies = 'all',
): { year: number; total: number }[] {
  const totalsByYear = new Map<number, number>();
  for (const row of rows) {
    if (row.climate_scenario !== climate || row.implement_plan !== plan) continue;
    if (species !== 'all' && row.species_id !== species) continue;
    totalsByYear.set(row.year, (totalsByYear.get(row.year) ?? 0) + row.biomass);
  }
  return Array.from(totalsByYear.entries())
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Per-year biomass for a SINGLE polygon under one scenario (climate, plan),
 * optionally restricted to one species. Used when a reef polygon is selected
 * so the biomass-over-time chart shows that polygon instead of the site total.
 */
export function polygonTotals(
  rows: CoralBiomassRow[],
  polygonId: number,
  climate: 0 | 1,
  plan: 0 | 1,
  species: CoralSpecies = 'all',
): { year: number; total: number }[] {
  const totalsByYear = new Map<number, number>();
  for (const row of rows) {
    if (row.polygon_id !== polygonId) continue;
    if (row.climate_scenario !== climate || row.implement_plan !== plan) continue;
    if (species !== 'all' && row.species_id !== species) continue;
    totalsByYear.set(row.year, (totalsByYear.get(row.year) ?? 0) + row.biomass);
  }
  return Array.from(totalsByYear.entries())
    .map(([year, total]) => ({ year, total }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Global max of per-polygon biomass across ALL scenarios and years, for a
 * given `species` selection. Used to fix a single choropleth color domain so
 * playback frames (and species toggles) are comparable within a mode. Each
 * species has its own domain so an isolated species map still uses the full
 * pale→teal ramp instead of washing out against the summed total.
 */
export function globalMaxPerPolygon(
  rows: CoralBiomassRow[],
  species: CoralSpecies = 'all',
): number {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (species !== 'all' && row.species_id !== species) continue;
    const key = `${row.climate_scenario}|${row.implement_plan}|${row.year}|${row.polygon_id}`;
    sums.set(key, (sums.get(key) ?? 0) + row.biomass);
  }
  let max = 0;
  for (const v of sums.values()) {
    if (v > max) max = v;
  }
  return max;
}

export interface UseCoralBiomassResult {
  years: number[];
  scenarios: CoralScenario[];
  /** Modelled species (id + label), sorted by id, resolved from the dataset. */
  speciesList: CoralSpeciesInfo[];
  perPolygon: (
    climate: 0 | 1,
    plan: 0 | 1,
    year: number,
    species?: CoralSpecies,
  ) => Map<number, number>;
  siteTotalSeries: (
    climate: 0 | 1,
    plan: 0 | 1,
    species?: CoralSpecies,
  ) => { year: number; total: number }[];
  /** Per-year series for a single reef polygon (by polygon_id). */
  polygonSeries: (
    polygonId: number,
    climate: 0 | 1,
    plan: 0 | 1,
    species?: CoralSpecies,
  ) => { year: number; total: number }[];
  /** Fixed color-domain max for the summed ('all') biomass mode. */
  maxBiomass: number;
  /** Fixed color-domain max for a given species selection ('all' | 1 | 2 | 3). */
  maxBiomassFor: (species: CoralSpecies) => number;
  loading: boolean;
  error: Error | null;
}

export function useCoralBiomass(): UseCoralBiomassResult {
  const { data, error, isLoading } = useSWR<CoralBiomassApiResponse>(
    `/api/data/${CORAL_BIOMASS_DATASET_ID}`,
    (url: string) => dataFetcher<CoralBiomassApiResponse>(url).then((r) => r.data),
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
    },
  );

  const rows = useMemo(() => (data?.rows ?? []).map(parseRow), [data]);

  const years = useMemo(() => Array.from(new Set(rows.map((r) => r.year))).sort((a, b) => a - b), [rows]);

  const speciesList = useMemo<CoralSpeciesInfo[]>(() => {
    const ids = new Set<1 | 2 | 3>();
    for (const row of rows) ids.add(row.species_id);
    return Array.from(ids)
      .sort((a, b) => a - b)
      .map((id) => ({ id, name: CORAL_SPECIES_NAMES[id] ?? `Species ${id}` }));
  }, [rows]);

  // Per-species (and 'all') color-domain maxima, computed once per dataset.
  const maxByMode = useMemo(
    () => ({
      all: globalMaxPerPolygon(rows, 'all'),
      1: globalMaxPerPolygon(rows, 1),
      2: globalMaxPerPolygon(rows, 2),
      3: globalMaxPerPolygon(rows, 3),
    }),
    [rows],
  );
  const maxBiomass = maxByMode.all;
  const maxBiomassFor = useMemo(
    () => (species: CoralSpecies) => maxByMode[species],
    [maxByMode],
  );

  // Memoize per-(climate,plan,year,species) and per-(climate,plan) aggregations so repeated
  // calls with the same key (e.g. across re-renders during playback) don't recompute.
  const perPolygonCache = useMemo(() => new Map<string, Map<number, number>>(), [rows]);
  const siteTotalsCache = useMemo(() => new Map<string, { year: number; total: number }[]>(), [rows]);

  const perPolygon = useMemo(
    () => (climate: 0 | 1, plan: 0 | 1, year: number, species: CoralSpecies = 'all') => {
      const key = `${climate}|${plan}|${year}|${species}`;
      let cached = perPolygonCache.get(key);
      if (!cached) {
        cached = sumPerPolygon(rows, climate, plan, year, species);
        perPolygonCache.set(key, cached);
      }
      return cached;
    },
    [rows, perPolygonCache],
  );

  const siteTotalSeries = useMemo(
    () => (climate: 0 | 1, plan: 0 | 1, species: CoralSpecies = 'all') => {
      const key = `${climate}|${plan}|${species}`;
      let cached = siteTotalsCache.get(key);
      if (!cached) {
        cached = siteTotals(rows, climate, plan, species);
        siteTotalsCache.set(key, cached);
      }
      return cached;
    },
    [rows, siteTotalsCache],
  );

  const polygonSeries = useMemo(
    () => (polygonId: number, climate: 0 | 1, plan: 0 | 1, species: CoralSpecies = 'all') => {
      const key = `p${polygonId}|${climate}|${plan}|${species}`;
      let cached = siteTotalsCache.get(key);
      if (!cached) {
        cached = polygonTotals(rows, polygonId, climate, plan, species);
        siteTotalsCache.set(key, cached);
      }
      return cached;
    },
    [rows, siteTotalsCache],
  );

  return {
    years,
    scenarios: CORAL_SCENARIOS,
    speciesList,
    perPolygon,
    siteTotalSeries,
    polygonSeries,
    maxBiomass,
    maxBiomassFor,
    loading: isLoading,
    error: error ?? null,
  };
}
