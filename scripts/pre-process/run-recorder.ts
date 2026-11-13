import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { db } from './firebase-admin'
import type { DatasetOutcome, DatasetOutcomeStatus, PipelineRunStatus } from '@/lib/data/types'

export interface StartRunOpts {
  runId: string
  triggeredBy: 'drive-change' | 'manual-dispatch' | 'schedule' | 'dataset-rerun'
  triggeredByIpHash?: string
  githubRunUrl: string
}

export interface RecordOutcomeOpts {
  runId: string
  datasetId: string
  status: DatasetOutcomeStatus
  version_before?: string
  version_after?: string
  reason?: string
  durationMs: number
}

export async function startRun(opts: StartRunOpts): Promise<void> {
  await db.collection('pipeline_runs').doc(opts.runId).set({
    triggered_by: opts.triggeredBy,
    triggered_by_ip_hash: opts.triggeredByIpHash ?? null,
    started_at: Timestamp.now(),
    status: 'running' as PipelineRunStatus,
    github_run_url: opts.githubRunUrl,
    summary: {
      datasets_total: 0,
      datasets_published: 0,
      datasets_skipped_nochange: 0,
      datasets_blocked_by_drift: 0,
      datasets_failed: 0,
      discovered_files_new: 0,
      schema_drift_opened: 0,
    },
    dataset_outcomes: [],
    drift_opened: [],
    discovered_new: [],
  })
}

export async function recordOutcome(opts: RecordOutcomeOpts): Promise<void> {
  // Firestore rejects `undefined` values — build with only defined fields.
  const outcome: DatasetOutcome = {
    dataset_id: opts.datasetId,
    status: opts.status,
    duration_ms: opts.durationMs,
  }
  if (opts.version_before !== undefined) outcome.version_before = opts.version_before
  if (opts.version_after !== undefined) outcome.version_after = opts.version_after
  if (opts.reason !== undefined) outcome.reason = opts.reason
  const ref = db.collection('pipeline_runs').doc(opts.runId)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return // no startRun was called — silent no-op so seed works without a run context
    const data = snap.data() as {
      dataset_outcomes?: DatasetOutcome[]
      summary?: Record<string, number>
    }
    const outcomes = [...(data.dataset_outcomes ?? []), outcome]
    const summary = { ...(data.summary ?? {}) }
    summary.datasets_total = outcomes.length
    summary.datasets_published = outcomes.filter((o) => o.status === 'published').length
    summary.datasets_skipped_nochange = outcomes.filter(
      (o) => o.status === 'skipped-nochange',
    ).length
    summary.datasets_blocked_by_drift = outcomes.filter(
      (o) => o.status === 'blocked-drift',
    ).length
    summary.datasets_failed = outcomes.filter((o) => o.status === 'failed').length
    tx.update(ref, { dataset_outcomes: outcomes, summary })
  })
}

async function updateIfExists(
  ref: FirebaseFirestore.DocumentReference,
  update: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
): Promise<void> {
  const snap = await ref.get()
  if (!snap.exists) return
  await ref.update(update)
}

export async function recordDriftOpened(runId: string, driftId: string): Promise<void> {
  await updateIfExists(db.collection('pipeline_runs').doc(runId), {
    drift_opened: FieldValue.arrayUnion(driftId),
    'summary.schema_drift_opened': FieldValue.increment(1),
  })
}

export async function recordDiscoveredNew(runId: string, hash: string): Promise<void> {
  await updateIfExists(db.collection('pipeline_runs').doc(runId), {
    discovered_new: FieldValue.arrayUnion(hash),
    'summary.discovered_files_new': FieldValue.increment(1),
  })
}

export async function finishRun(opts: {
  runId: string
  errorSummary?: string
}): Promise<void> {
  const ref = db.collection('pipeline_runs').doc(opts.runId)
  const snap = await ref.get()
  const data = snap.data() as
    | {
        started_at: Timestamp
        dataset_outcomes: DatasetOutcome[]
      }
    | undefined
  if (!data) return // startRun wasn't called — silent no-op

  const outcomes = data.dataset_outcomes
  const hasSuccess = outcomes.some(
    (o) => o.status === 'published' || o.status === 'skipped-nochange',
  )
  const hasFailure = outcomes.some((o) => o.status === 'failed')
  const status: PipelineRunStatus =
    !outcomes.length || (hasFailure && !hasSuccess)
      ? 'failed'
      : hasFailure
        ? 'partial'
        : 'success'

  const now = Timestamp.now()
  const startedMillis = data.started_at.toMillis()
  await ref.update({
    status,
    ended_at: now,
    duration_ms: now.toMillis() - startedMillis,
    error_summary: opts.errorSummary ?? null,
  })
}
