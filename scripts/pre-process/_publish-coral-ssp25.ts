// One-off publisher for the SSP-2.5 coral biomass variant. Additive: creates a
// NEW dataset id (output-lb-coral-biomass-by-species-yearly-ssp25) so the
// original observed-base dataset stays intact for instant revert. Reuses the
// prod publishAsset() path (GCS upload + Firestore catalog doc).
//
// Run: npx tsx scripts/pre-process/_publish-coral-ssp25.ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { publishAsset } from './publish'
import type { Provenance } from '@/lib/data/types'

const NEW_ID = 'output-lb-coral-biomass-by-species-yearly-ssp25'
const CSV_PATH = resolve('scripts/simile/output/coral-biomass-by-species-yearly-ssp25.csv')

const SOURCE =
  'MIDAS/MIMES Belize 2026 project — Simile MIMES output (SSP-2.5 base: SST BC = "Placencia Mod 2.5"; SST CC = "Placencia Mod 4.5"). Regenerated 2026-07-06 by scripts/simile R harness from lbd.sml, Simile v7.4.'
const LICENSE =
  'Shared by project collaborators for internal use; not for public redistribution without provenance check.'

const COLUMNS = [
  'run_id',
  'climate_scenario',
  'implement_plan',
  'sim_day',
  'year',
  'polygon_id',
  'species_id',
  'species',
  'biomass',
] as const

// Minimal RFC-4180 line parser: R's write.table(qmethod="double") wraps
// character columns in double quotes and doubles embedded quotes.
function parseLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQ = false
        }
      } else {
        cur += c
      }
    } else if (c === '"') {
      inQ = true
    } else if (c === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  out.push(cur)
  return out
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/)
  const header = parseLine(lines[0])
  return lines.slice(1).map((line) => {
    const cells = parseLine(line)
    const row: Record<string, string> = {}
    header.forEach((h, i) => {
      row[h] = cells[i]
    })
    // Provenance columns carried on every row, matching the existing dataset.
    row.source = SOURCE
    row.license = LICENSE
    return row
  })
}

async function main() {
  const csvBytes = readFileSync(CSV_PATH)
  const rows = parseCsv(csvBytes.toString('utf-8'))
  const asset = {
    dataset_id: NEW_ID,
    row_count: rows.length,
    columns: [...COLUMNS],
    rows,
  }
  const assetBytes = Buffer.from(JSON.stringify(asset), 'utf-8')

  const provenance: Provenance = {
    license: LICENSE,
    citation:
      'MIDAS/MIMES Belize 2026 — Laughing Bird coral biomass by species, yearly, across climate x restoration scenarios (SSP-2.5 base).',
    upstream_paths: ['scripts/simile/output/coral-biomass-by-species-yearly-ssp25.csv'],
    source: SOURCE,
    source_url: null,
  }

  const result = await publishAsset({
    definition: {
      id: NEW_ID,
      title: 'Laughing Bird coral biomass by species — yearly scenario matrix (SSP-2.5 base)',
      description:
        "Tidy long-format time series of coral biomass for each of the 3 coral species (Acropora palmata, Acropora cervicornis, Orbicella spp.) at each of the 43 marine polygons at Laughing Bird Caye, sampled on Jan 1 of each simulated year over a ~12.5-year run. Four scenarios: Climate Scenario {0=SSP-2.5 'Placencia Mod 2.5', 1=SSP-4.5 'Placencia Mod 4.5'} x Implement the plan {0=no restoration, 1=restoration}. Columns: run_id, climate_scenario, implement_plan, sim_day, year, polygon_id, species_id, species, biomass. Generated headless from the compiled lbd.dylib via the R 'Simile' package.",
      family: 'mimes-scenario-output-timeseries',
      schemaId: 'mimes-scenario-output-timeseries',
      schemaVersion: 1,
      scope: 'site',
      sites: ['laughing-bird'],
      tags: ['mimes-output', 'scenario-timeseries', 'simile', 'coral', 'laughing-bird', 'ssp-2.5'],
      provenance,
    },
    asset: {
      bytes: assetBytes,
      contentType: 'application/json',
      extension: '.json',
    },
    inputs: [{ path: 'scripts/simile/output/coral-biomass-by-species-yearly-ssp25.csv', bytes: csvBytes }],
    pipelineRunId: 'manual-ssp25-2026-07-06',
  })

  console.log('PUBLISHED', JSON.stringify({ id: NEW_ID, ...result, rows: rows.length, bytes: assetBytes.byteLength }, null, 2))
}

main().catch((e) => {
  console.error('PUBLISH FAILED:', e)
  process.exit(1)
})
