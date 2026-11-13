import { declareSchema } from './_template'

/**
 * MIMES Simile-model scenario output time-series. Headers always start
 * with "Time" followed by indexed columns of the form
 * `Variable/i/j/...` (e.g. `BIOMASS/1/1/12`, `LandCovers/2/3`,
 * `Wave Energy/8`). One file per scenario × output-variable per site,
 * with the scenario suffix encoded in the filename (BC=BaseCase,
 * WC=WorstCase, Deg=Degraded, Res=Restoration, etc.).
 */
export const mimesScenarioOutputTimeseries = declareSchema({
  id: 'mimes-scenario-output-timeseries',
  family: 'mimes-output',
  classify: (headers) =>
    headers.length >= 2 &&
    /^time$/i.test(headers[0].trim()) &&
    headers.slice(1).some((c) => /\/\d+/.test(c)),
})
