#!/usr/bin/env tsx
import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

const DATA_EXTS = new Set([
  '.csv',
  '.shp',
  '.tif',
  '.tiff',
  '.geojson',
  '.json',
])
const SKIP_DIR_NAMES = new Set(['.git', 'node_modules', '.DS_Store'])

export interface AuditOpts {
  referenceRoot: string
  prodUrl: string
  emitJson: boolean
  verbose: boolean
}

export interface AuditReport {
  reference_root: string
  prod_url: string
  reference_files: number
  prod_datasets: number
  prod_upstream_paths: number
  local_referenced_overlap: number
  orphan_local: string[]
  missing_upstreams: { path: string; referenced_by: string[] }[]
}

async function walkDataFiles(dir: string, root: string, out: string[]): Promise<void> {
  let entries: import('node:fs').Dirent[]
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return
    throw err
  }
  for (const entry of entries) {
    if (SKIP_DIR_NAMES.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      await walkDataFiles(full, root, out)
      continue
    }
    if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (DATA_EXTS.has(ext)) {
        out.push(path.relative(root, full))
      }
    }
  }
}

interface ProdDataset {
  id: string
  provenance?: { upstream_paths?: string[] }
}

async function fetchProdDatasets(prodUrl: string): Promise<ProdDataset[]> {
  const url = `${prodUrl.replace(/\/$/, '')}/api/ops/datasets`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`prod fetch ${url} failed: HTTP ${res.status}`)
  }
  const body = (await res.json()) as { datasets?: ProdDataset[] }
  if (!body.datasets) {
    throw new Error(`prod response missing 'datasets' field: ${JSON.stringify(body).slice(0, 200)}`)
  }
  return body.datasets
}

export async function auditCatalog(opts: AuditOpts): Promise<AuditReport> {
  const repoRoot = path.resolve(opts.referenceRoot, '..')
  const localPaths: string[] = []
  await walkDataFiles(opts.referenceRoot, repoRoot, localPaths)
  const localSet = new Set(localPaths.map((p) => p.replace(/\\/g, '/')))

  const datasets = await fetchProdDatasets(opts.prodUrl)
  const upstreamBy = new Map<string, string[]>()
  for (const ds of datasets) {
    for (const up of ds.provenance?.upstream_paths ?? []) {
      const norm = up.replace(/\\/g, '/')
      const existing = upstreamBy.get(norm) ?? []
      existing.push(ds.id)
      upstreamBy.set(norm, existing)
    }
  }

  const referencedSet = new Set(upstreamBy.keys())
  const intersection = new Set<string>()
  const orphanLocal: string[] = []
  for (const p of localSet) {
    if (referencedSet.has(p)) intersection.add(p)
    else orphanLocal.push(p)
  }
  orphanLocal.sort()

  const missingUpstreams: { path: string; referenced_by: string[] }[] = []
  for (const [p, ids] of upstreamBy) {
    if (!localSet.has(p)) {
      missingUpstreams.push({ path: p, referenced_by: ids.sort() })
    }
  }
  missingUpstreams.sort((a, b) => a.path.localeCompare(b.path))

  return {
    reference_root: opts.referenceRoot,
    prod_url: opts.prodUrl,
    reference_files: localSet.size,
    prod_datasets: datasets.length,
    prod_upstream_paths: upstreamBy.size,
    local_referenced_overlap: intersection.size,
    orphan_local: orphanLocal,
    missing_upstreams: missingUpstreams,
  }
}

function renderText(report: AuditReport, verbose: boolean): string {
  const lines: string[] = []
  lines.push('Catalog audit')
  lines.push(`  reference root  : ${report.reference_root}`)
  lines.push(`  prod url        : ${report.prod_url}`)
  lines.push('')
  lines.push(`  reference files : ${report.reference_files}`)
  lines.push(`  prod datasets   : ${report.prod_datasets}`)
  lines.push(`  upstream paths  : ${report.prod_upstream_paths}`)
  lines.push(`  in both         : ${report.local_referenced_overlap}`)
  lines.push('')
  lines.push(
    `  orphan local    : ${report.orphan_local.length}  (in reference/, no prod dataset claims them)`,
  )
  lines.push(
    `  missing upstreams: ${report.missing_upstreams.length}  (prod claims them, not in reference/)`,
  )

  if (report.missing_upstreams.length > 0) {
    lines.push('')
    lines.push('Missing upstreams (severity: high — prod claims a source that is gone):')
    for (const m of report.missing_upstreams) {
      lines.push(`  ${m.path}`)
      lines.push(`    referenced by: ${m.referenced_by.join(', ')}`)
    }
  }

  if (verbose && report.orphan_local.length > 0) {
    lines.push('')
    lines.push('Orphan local files (informational — may be WIP, sidecars not yet authored, or intentionally unpublished):')
    for (const p of report.orphan_local) {
      lines.push(`  ${p}`)
    }
  } else if (report.orphan_local.length > 0) {
    lines.push('')
    lines.push(`  (re-run with --verbose to list orphan local files)`)
  }

  return lines.join('\n')
}

function parseArgs(argv: string[]): AuditOpts {
  const arg = (flag: string): string | undefined => {
    const idx = argv.indexOf(flag)
    return idx >= 0 ? argv[idx + 1] : undefined
  }
  return {
    referenceRoot: path.resolve(arg('--reference-dir') ?? path.join(process.cwd(), 'reference')),
    prodUrl: arg('--prod-url') ?? 'https://midas-belize-prod.web.app',
    emitJson: argv.includes('--json'),
    verbose: argv.includes('--verbose'),
  }
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2))
  const report = await auditCatalog(opts)
  if (opts.emitJson) {
    process.stdout.write(JSON.stringify(report, null, 2) + '\n')
  } else {
    process.stdout.write(renderText(report, opts.verbose) + '\n')
  }
  process.exit(report.missing_upstreams.length > 0 ? 2 : 0)
}

const isEntrypoint =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href

if (isEntrypoint) {
  main().catch((err) => {
    console.error('audit-catalog failed:', err instanceof Error ? err.message : err)
    process.exit(1)
  })
}
