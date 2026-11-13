import crypto from 'node:crypto'
import { crawlBucket } from './crawler'
import { groupFiles } from './grouper'
import { classify } from './classifier'
import { loadProvenanceForGroup, type ProvenanceHints } from './provenance'
import { publishAsset } from './publish'
import { recordDiscovered } from './discovered'
import { recordOutcome, recordDiscoveredNew } from './run-recorder'
import { bucket } from './firebase-admin'
import './schemas/index'
import './converters/_load'
import type { FileGroup } from './types'
import type { SiteId } from '@/lib/data/types'

export interface SeedFailure {
  path: string
  dataset_id?: string
  reason: string
}

export interface SeedSummary {
  scanned: number
  published: number
  skipped_nochange: number
  blocked_provenance: number
  discovered: number
  failed: number
  would_publish: number
  failures: SeedFailure[]
}

export interface SeedOpts {
  runId: string
  dryRun: boolean
  prefix?: string
}

interface GroupWithHint extends FileGroup {
  _provenance?: ProvenanceHints
}

async function readBucketFile(path: string): Promise<Buffer> {
  const [bytes] = await bucket.file(path).download()
  return bytes
}

export async function seedFromRaw(opts: SeedOpts): Promise<SeedSummary> {
  const prefix = opts.prefix ?? 'raw/'
  const files = await crawlBucket(prefix)
  const groups: GroupWithHint[] = groupFiles(files)

  const summary: SeedSummary = {
    scanned: groups.length,
    published: 0,
    skipped_nochange: 0,
    blocked_provenance: 0,
    discovered: 0,
    failed: 0,
    would_publish: 0,
    failures: [],
  }

  for (const group of groups) {
    const t0 = Date.now()
    try {
      const provResult = await loadProvenanceForGroup(group)
      if (
        provResult.status === 'awaiting-provenance' ||
        provResult.status === 'provenance-incomplete'
      ) {
        summary.blocked_provenance++
        continue
      }
      if (provResult.hints.tags?.includes('provenance-unresolved')) {
        console.warn(
          `seed: skipping ${group.primary.relativePath} — provenance-unresolved tag (identify the source + remove the tag before seeding)`,
        )
        summary.blocked_provenance++
        continue
      }
      group._provenance = provResult.hints

      const handler = classify(group)
      if (!handler) {
        if (!group.primary.relativePath.endsWith('.provenance.json')) {
          await recordDiscovered(group.primary, opts.runId)
          const hash = crypto.createHash('sha1').update(group.primary.path).digest('hex')
          await recordDiscoveredNew(opts.runId, hash)
          summary.discovered++
        }
        continue
      }

      if (opts.dryRun) {
        summary.would_publish++
        continue
      }

      const asset = await handler.convert(group, {
        datasetId: provResult.hints.dataset_id ?? 'unknown',
        provenance: provResult.provenance,
        readFile: readBucketFile,
      })

      const datasetId = provResult.hints.dataset_id
      if (!datasetId) {
        const reason = 'no dataset_id in provenance hints'
        console.warn(`seed: skipping ${group.primary.relativePath}: ${reason}`)
        summary.failed++
        summary.failures.push({ path: group.primary.relativePath, reason })
        await recordOutcome({
          runId: opts.runId,
          datasetId: group.primary.relativePath,
          status: 'failed',
          reason,
          durationMs: Date.now() - t0,
        })
        continue
      }

      const scope = provResult.hints.scope ?? 'site'
      const sites: SiteId[] =
        scope === 'national'
          ? []
          : ((provResult.hints.sites as SiteId[] | undefined) ?? ['placencia'])

      // Include the provenance.json in the input set so edits to join_key /
      // csv_key / etc. trigger a fresh content-hash + republish. Previously
      // the hash only covered the data file + non-provenance sidecars, so a
      // pure-provenance fix (e.g. correcting a join_key) silently failed to
      // re-publish — the converter ran with the new hint but publishAsset
      // matched the old version's hash and skipped. Discovered 2026-05-12 in
      // Track H investigation.
      const inputFiles = [
        group.primary,
        ...group.sidecars,
        ...(group.provenanceFile ? [group.provenanceFile] : []),
      ]
      const inputs = await Promise.all(
        inputFiles.map(async (f) => ({
          path: f.path,
          bytes: await readBucketFile(f.path),
        })),
      )

      const result = await publishAsset({
        definition: {
          id: datasetId,
          title: provResult.hints.title ?? datasetId,
          description: provResult.hints.description ?? provResult.hints.notes ?? '',
          family: provResult.hints.schema_family ?? 'unknown',
          schemaId: provResult.hints.schema_family ?? 'unknown',
          schemaVersion: 1,
          scope,
          sites,
          tags: provResult.hints.tags ?? [],
          provenance: provResult.provenance,
        },
        asset,
        inputs,
        pipelineRunId: opts.runId,
      })
      if (result.skipped) summary.skipped_nochange++
      else summary.published++
      await recordOutcome({
        runId: opts.runId,
        datasetId,
        status: result.skipped ? 'skipped-nochange' : 'published',
        version_after: result.version,
        durationMs: Date.now() - t0,
      })
    } catch (err) {
      const reason = (err as Error).message
      console.error(`seed: failed on ${group.primary.relativePath}: ${reason}`)
      summary.failed++
      const failedDatasetId = (group as GroupWithHint)._provenance?.dataset_id
      summary.failures.push({
        path: group.primary.relativePath,
        dataset_id: failedDatasetId,
        reason,
      })
      await recordOutcome({
        runId: opts.runId,
        datasetId: failedDatasetId ?? group.primary.relativePath,
        status: 'failed',
        reason,
        durationMs: Date.now() - t0,
      })
    }
  }

  return summary
}
