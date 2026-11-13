import crypto from 'node:crypto'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { db } from './firebase-admin'
import type { IncomingSpec } from './schemas/_types'

export interface HeaderDiff {
  isBreaking: boolean
  missing_required: string[]
  added_unknown: string[]
  renamed_candidates: Array<{ from: string; to: string; confidence: number }>
  dropped_dynamic: string[]
}

function matchesAnyPattern(column: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(column))
}

function similarity(a: string, b: string): number {
  const aNorm = a.toLowerCase().replace(/[_\s-]/g, '')
  const bNorm = b.toLowerCase().replace(/[_\s-]/g, '')
  if (aNorm === bNorm) return 1
  const shorter = aNorm.length < bNorm.length ? aNorm : bNorm
  const longer = aNorm.length >= bNorm.length ? aNorm : bNorm
  for (let len = shorter.length; len >= 2; len--) {
    for (let i = 0; i + len <= shorter.length; i++) {
      const sub = shorter.slice(i, i + len)
      if (longer.includes(sub)) return len / longer.length
    }
  }
  return 0
}

export function diffHeader(headers: string[], spec: IncomingSpec): HeaderDiff {
  const known = new Set([...spec.required, ...spec.optional])
  const missing_required = spec.required.filter((c) => !headers.includes(c))

  const added_unknown: string[] = []
  for (const h of headers) {
    if (known.has(h)) continue
    if (matchesAnyPattern(h, spec.patterns)) continue
    added_unknown.push(h)
  }

  const renamed_candidates: HeaderDiff['renamed_candidates'] = []
  if (missing_required.length > 0 && added_unknown.length > 0) {
    for (const missing of missing_required) {
      let best: { to: string; confidence: number } | null = null
      for (const added of added_unknown) {
        const confidence = similarity(missing, added)
        if (confidence > 0.4 && (!best || confidence > best.confidence)) {
          best = { to: added, confidence }
        }
      }
      if (best) renamed_candidates.push({ from: missing, ...best })
    }
  }

  return {
    isBreaking: missing_required.length > 0,
    missing_required,
    added_unknown,
    renamed_candidates,
    dropped_dynamic: [],
  }
}

export interface RecordDriftOptions {
  schemaId: string
  schemaVersion: number
  diff: HeaderDiff
  sourceFilePath: string
  sampleRows: Record<string, unknown>[]
  affectedDatasets: string[]
  runId: string
}

export async function recordDrift(opts: RecordDriftOptions): Promise<string> {
  const { schemaId, schemaVersion, diff, sourceFilePath, sampleRows, affectedDatasets, runId } = opts
  const fingerprint = `${schemaId}:${schemaVersion}:${[...diff.missing_required].sort().join(',')}:${sourceFilePath}`
  const ticketId = crypto.createHash('sha1').update(fingerprint).digest('hex')
  const ref = db.collection('schema_drift').doc(ticketId)
  const existing = await ref.get()
  const now = Timestamp.now()

  if (existing.exists) {
    await ref.update({
      last_seen_in_run: runId,
      last_seen_at: now,
      occurrence_count: FieldValue.increment(1),
      affected_datasets: FieldValue.arrayUnion(...affectedDatasets),
    })
  } else {
    await ref.set({
      schema_id: schemaId,
      current_schema_version: schemaVersion,
      detected_at: now,
      first_seen_in_run: runId,
      last_seen_in_run: runId,
      last_seen_at: now,
      occurrence_count: 1,
      diff,
      affected_datasets: affectedDatasets,
      sample_rows: sampleRows.slice(0, 10),
      source_file_path: sourceFilePath,
      status: 'open',
    })
  }

  return ticketId
}
