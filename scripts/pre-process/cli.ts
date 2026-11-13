#!/usr/bin/env tsx
import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import './converters/_load'
import './schemas/index'
import { ALL_DATASETS, findDataset } from './datasets/_load'
import { findHandler } from './registry'
import { getSchemas } from './schemas/_register'
import { publishAsset } from './publish'
import { crawlBucket } from './crawler'
import { groupFiles } from './grouper'
import { classify } from './classifier'
import { recordDiscovered } from './discovered'
import { rebuildVisibleAt } from './rebuild-visible-at'
import { seedFromRaw } from './seed'
import { startRun, finishRun } from './run-recorder'
import type { DatasetDefinition, DetectedFile, FileGroup } from './types'

interface CliOpts {
  only?: string
  dryRun: boolean
  seed: boolean
  referenceRoot: string
}

function parseArgs(argv: string[]): CliOpts {
  const opts: CliOpts = {
    dryRun: argv.includes('--dry-run'),
    seed: argv.includes('--seed') || argv.includes('--all'),
    referenceRoot: process.env.REFERENCE_ROOT ?? path.resolve(process.cwd(), 'reference'),
  }
  const onlyIdx = argv.indexOf('--only')
  if (onlyIdx >= 0 && argv[onlyIdx + 1]) opts.only = argv[onlyIdx + 1]
  return opts
}

async function readFileFromReference(root: string, relPath: string): Promise<Buffer> {
  return fs.readFile(path.join(root, relPath))
}

function detectedFrom(rel: string): DetectedFile {
  return {
    path: rel,
    relativePath: rel,
    ext: path.extname(rel).toLowerCase(),
    size_bytes: 0,
    mtime: new Date(),
  }
}

function buildFileGroup(def: DatasetDefinition): FileGroup {
  const up = def.upstream
  const full = (p: string) => path.join(up.basePath, p)
  const primary = detectedFrom(full(up.primaryFile))
  const sidecars =
    up.kind === 'shapefile' ? up.sidecarFiles.map((s) => detectedFrom(full(s))) : []
  return { primary, sidecars, provenanceFile: null }
}

async function processDataset(
  def: DatasetDefinition,
  opts: CliOpts,
  runId: string,
): Promise<void> {
  console.log(`[${def.id}] processing…`)
  const group = buildFileGroup(def)
  const handler = findHandler(group)
  if (!handler) {
    console.error(`[${def.id}] no handler matched — skipping`)
    return
  }

  const readFile = (p: string) => readFileFromReference(opts.referenceRoot, p)
  const asset = await handler.convert(group, {
    datasetId: def.id,
    provenance: def.provenance,
    readFile,
  })
  console.log(
    `[${def.id}] converted — ${asset.feature_count ?? '?'} features, ${asset.bytes.byteLength} bytes`,
  )

  if (opts.dryRun) {
    console.log(`[${def.id}] DRY-RUN: would publish`)
    return
  }

  const inputBytes = await Promise.all(
    [group.primary, ...group.sidecars].map(async (f) => {
      try {
        return { path: f.path, bytes: await readFile(f.path) }
      } catch {
        return null
      }
    }),
  )
  const presentInputs = inputBytes.filter((x): x is { path: string; bytes: Buffer } => x !== null)

  const result = await publishAsset({
    definition: def,
    asset,
    inputs: presentInputs,
    pipelineRunId: runId,
  })
  console.log(
    `[${def.id}] ${result.skipped ? 'skipped (no change)' : `published ${result.version} → ${result.gcsPath}`}`,
  )
}

export async function runDiscoveryPipeline(opts: { runId: string; dryRun: boolean }): Promise<void> {
  const files = await crawlBucket('raw/')
  const groups = groupFiles(files)
  console.log(`Discovery: crawled ${files.length} files, grouped into ${groups.length} units`)

  for (const group of groups) {
    const handler = classify(group)
    if (!handler) {
      if (group.primary.relativePath.endsWith('.provenance.json')) continue
      if (!opts.dryRun) await recordDiscovered(group.primary, opts.runId)
      console.log(`  discovered (no converter): ${group.primary.relativePath}`)
      continue
    }
    console.log(`  ${handler.id} → ${group.primary.relativePath}`)
  }
}

async function main() {
  if (process.argv.includes('--list-schemas')) {
    for (const s of getSchemas()) {
      console.log(`${s.id}\t(family=${s.family}, v${s.schemaVersion})`)
    }
    return
  }

  if (process.argv.includes('--rebuild-visible-at')) {
    const r = await rebuildVisibleAt()
    console.log(`visible_at: updated ${r.updated}/${r.scanned} datasets`)
    return
  }

  const opts = parseArgs(process.argv.slice(2))
  const runId = `cli-${new Date().toISOString().replace(/[:.]/g, '-')}`

  if (opts.seed) {
    const envRunId = process.env.PIPELINE_RUN_ID
    const actualRunId = envRunId ?? runId
    const triggeredBy = (process.env.PIPELINE_TRIGGER ?? 'manual-dispatch') as
      | 'drive-change'
      | 'manual-dispatch'
      | 'schedule'
      | 'dataset-rerun'
    const githubRunUrl = process.env.GITHUB_RUN_URL ?? 'local'

    if (!opts.dryRun) {
      await startRun({ runId: actualRunId, triggeredBy, githubRunUrl })
    }
    let summary
    try {
      summary = await seedFromRaw({ runId: actualRunId, dryRun: opts.dryRun })
    } finally {
      if (!opts.dryRun) {
        await finishRun({ runId: actualRunId })
      }
    }
    const { failures, ...counts } = summary
    console.log('Seed summary:', counts)
    if (failures.length > 0) {
      console.log()
      console.log(`Failures (${failures.length}):`)
      const byReason = new Map<string, number>()
      for (const f of failures) {
        console.log(`  [${f.dataset_id ?? '?'}] ${f.path}`)
        console.log(`    → ${f.reason}`)
        byReason.set(f.reason, (byReason.get(f.reason) ?? 0) + 1)
      }
      console.log()
      console.log('Failures grouped by reason:')
      for (const [reason, n] of [...byReason.entries()].sort((a, b) => b[1] - a[1])) {
        console.log(`  ${n}×  ${reason}`)
      }
    }
    return
  }

  if (opts.only) {
    const d = findDataset(opts.only)
    if (!d) {
      console.error(`Unknown dataset: ${opts.only}`)
      process.exit(1)
    }
    try {
      await processDataset(d, opts, runId)
    } catch (err) {
      console.error(`[${d.id}] FAILED: ${(err as Error).message}`)
    }
    return
  }

  console.error('Usage: pnpm preprocess [--only <id> | --all | --seed] [--dry-run]')
  process.exit(1)
}

const invokedDirectly =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (invokedDirectly) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

export { ALL_DATASETS }
