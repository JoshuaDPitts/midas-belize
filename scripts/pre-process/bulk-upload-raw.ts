#!/usr/bin/env tsx
/**
 * Bulk-upload upstream data files + .provenance.json sidecars from
 * local directories into `gs://midas-data/raw/`.
 *
 * This is a pre-Stage-3 bridge tool. Once the Drive-poller (DL-028)
 * ships, this script is retired — Drive changes will mirror into
 * gs://midas-data/raw/ automatically.
 *
 * Usage:
 *   # Default: uploads only the files referenced by the 58 provenance drafts.
 *   USE_EMULATORS=0 pnpm tsx scripts/pre-process/bulk-upload-raw.ts
 *
 *   # Dry-run (no writes, just reports what would happen):
 *   USE_EMULATORS=0 pnpm tsx scripts/pre-process/bulk-upload-raw.ts --dry-run
 *
 *   # Skip idempotency check (force re-upload):
 *   pnpm tsx scripts/pre-process/bulk-upload-raw.ts --force
 *
 *   # Custom roots:
 *   REFERENCE_ROOT=/path/to/reference DRAFTS_ROOT=/path/to/drafts \
 *     pnpm tsx scripts/pre-process/bulk-upload-raw.ts
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { bucket } from './firebase-admin'

interface UploadPlan {
  // Local absolute path → GCS destination path (always starts with 'raw/')
  sourceFiles: Map<string, string>
  provenanceFiles: Map<string, string>
}

interface UploadSummary {
  planned: number
  uploaded: number
  skipped_existing: number
  failed: number
}

interface ProvenanceDraft {
  upstream_paths?: string[]
  _target_path?: string
}

const DEFAULT_REFERENCE_ROOT = path.resolve(
  process.cwd(),
  process.env.REFERENCE_ROOT ?? 'reference',
)
const DEFAULT_DRAFTS_ROOT = path.resolve(
  process.cwd(),
  process.env.DRAFTS_ROOT ?? 'scripts/pre-process/provenance',
)

async function* walk(dir: string): AsyncGenerator<string> {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(p)
    else yield p
  }
}

async function collectUploadPlan(
  referenceRoot: string,
  draftsRoot: string,
): Promise<UploadPlan> {
  const sourceFiles = new Map<string, string>()
  const provenanceFiles = new Map<string, string>()

  for await (const draftPath of walk(draftsRoot)) {
    if (!draftPath.endsWith('.provenance.json')) continue

    const raw = await fs.readFile(draftPath, 'utf-8')
    let draft: ProvenanceDraft
    try {
      draft = JSON.parse(raw)
    } catch (err) {
      console.warn(`  skipping malformed draft ${draftPath}: ${(err as Error).message}`)
      continue
    }

    if (draft._target_path) {
      provenanceFiles.set(draftPath, draft._target_path.replace(/^raw\//, 'raw/'))
    }

    for (const upstream of draft.upstream_paths ?? []) {
      if (upstream.startsWith('external:')) continue
      const rel = upstream.replace(/^reference\//, '')
      const local = path.join(referenceRoot, rel)
      const dest = `raw/${rel.replace(/\\/g, '/')}`
      sourceFiles.set(local, dest)

      const base = local.replace(/\.(shp|tif|tiff|csv|geojson|json)$/i, '')
      if (local !== base) {
        for (const ext of ['.shx', '.dbf', '.prj', '.cpg', '.sbn', '.sbx', '.aux.xml']) {
          const sidecar = `${base}${ext}`
          try {
            await fs.access(sidecar)
            const sidecarDest = `raw/${path
              .relative(referenceRoot, sidecar)
              .replace(/\\/g, '/')}`
            sourceFiles.set(sidecar, sidecarDest)
          } catch {
            /* sidecar doesn't exist, skip */
          }
        }
      }
    }
  }

  return { sourceFiles, provenanceFiles }
}

async function upload(
  plan: UploadPlan,
  opts: { dryRun: boolean; force: boolean },
): Promise<UploadSummary> {
  const summary: UploadSummary = { planned: 0, uploaded: 0, skipped_existing: 0, failed: 0 }
  const entries = [
    ...Array.from(plan.sourceFiles, ([src, dst]) => ({ src, dst, kind: 'source' as const })),
    ...Array.from(plan.provenanceFiles, ([src, dst]) => ({ src, dst, kind: 'provenance' as const })),
  ]
  summary.planned = entries.length

  for (const { src, dst, kind } of entries) {
    try {
      await fs.access(src)
    } catch {
      console.warn(`  missing local ${kind}: ${src} (won't upload)`)
      summary.failed++
      continue
    }

    if (!opts.force) {
      const [exists] = await bucket.file(dst).exists()
      if (exists) {
        summary.skipped_existing++
        continue
      }
    }

    if (opts.dryRun) {
      console.log(`  [dry-run] ${kind}: ${src} → ${dst}`)
      summary.uploaded++
      continue
    }

    try {
      await bucket.upload(src, { destination: dst, resumable: false })
      console.log(`  ${kind}: ${src} → ${dst}`)
      summary.uploaded++
    } catch (err) {
      console.error(`  FAILED ${kind}: ${src} — ${(err as Error).message}`)
      summary.failed++
    }
  }
  return summary
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const force = argv.includes('--force')

  console.log(`Reference root: ${DEFAULT_REFERENCE_ROOT}`)
  console.log(`Drafts root:    ${DEFAULT_DRAFTS_ROOT}`)
  console.log(`Mode:           ${dryRun ? 'DRY-RUN' : force ? 'FORCE upload' : 'upload (skip existing)'}`)
  console.log()

  const plan = await collectUploadPlan(DEFAULT_REFERENCE_ROOT, DEFAULT_DRAFTS_ROOT)
  console.log(`Planned: ${plan.sourceFiles.size} source + ${plan.provenanceFiles.size} provenance = ${plan.sourceFiles.size + plan.provenanceFiles.size} files`)
  console.log()

  const summary = await upload(plan, { dryRun, force })
  console.log()
  console.log('Summary:', summary)
  if (summary.failed > 0) process.exit(1)
}

const isDirectInvocation =
  !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isDirectInvocation) {
  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}

export { collectUploadPlan, upload, type UploadPlan, type UploadSummary }
