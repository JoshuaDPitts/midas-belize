import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import {
  startRun,
  recordOutcome,
  finishRun,
  recordDriftOpened,
  recordDiscoveredNew,
} from '../../../scripts/pre-process/run-recorder'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('run-recorder', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('pipeline_runs').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  it('records a full run lifecycle with outcomes + summary', async () => {
    const runId = 'test-r1'
    await startRun({
      runId,
      triggeredBy: 'manual-dispatch',
      githubRunUrl: 'https://github.com/x/y/actions/runs/1',
    })

    await recordOutcome({
      runId,
      datasetId: 'a',
      status: 'published',
      version_after: 'v1',
      durationMs: 120,
    })
    await recordOutcome({
      runId,
      datasetId: 'b',
      status: 'skipped-nochange',
      version_before: 'v1',
      version_after: 'v1',
      durationMs: 30,
    })
    await recordOutcome({
      runId,
      datasetId: 'c',
      status: 'failed',
      reason: 'boom',
      durationMs: 5,
    })

    await finishRun({ runId })

    const snap = await getFirestore().collection('pipeline_runs').doc(runId).get()
    expect(snap.exists).toBe(true)
    const data = snap.data()!
    expect(data.status).toBe('partial')
    expect(data.dataset_outcomes).toHaveLength(3)
    expect(data.summary.datasets_total).toBe(3)
    expect(data.summary.datasets_published).toBe(1)
    expect(data.summary.datasets_skipped_nochange).toBe(1)
    expect(data.summary.datasets_failed).toBe(1)
    expect(data.started_at).toBeTruthy()
    expect(data.ended_at).toBeTruthy()
    expect(typeof data.duration_ms).toBe('number')
  })

  it('status=success when all outcomes succeed', async () => {
    await startRun({ runId: 'ok', triggeredBy: 'schedule', githubRunUrl: 'url' })
    await recordOutcome({ runId: 'ok', datasetId: 'a', status: 'published', durationMs: 1 })
    await finishRun({ runId: 'ok' })
    const snap = await getFirestore().collection('pipeline_runs').doc('ok').get()
    expect(snap.data()!.status).toBe('success')
  })

  it('status=failed when all outcomes fail', async () => {
    await startRun({ runId: 'bad', triggeredBy: 'schedule', githubRunUrl: 'url' })
    await recordOutcome({
      runId: 'bad',
      datasetId: 'a',
      status: 'failed',
      reason: 'err',
      durationMs: 1,
    })
    await finishRun({ runId: 'bad', errorSummary: 'see outcomes' })
    const snap = await getFirestore().collection('pipeline_runs').doc('bad').get()
    expect(snap.data()!.status).toBe('failed')
    expect(snap.data()!.error_summary).toBe('see outcomes')
  })

  it('status=failed when no outcomes recorded at all', async () => {
    await startRun({ runId: 'empty', triggeredBy: 'schedule', githubRunUrl: 'url' })
    await finishRun({ runId: 'empty' })
    const snap = await getFirestore().collection('pipeline_runs').doc('empty').get()
    expect(snap.data()!.status).toBe('failed')
  })

  it('recordDriftOpened + recordDiscoveredNew update arrays + summary counters', async () => {
    await startRun({ runId: 'drift-disc', triggeredBy: 'schedule', githubRunUrl: 'u' })
    await recordDriftOpened('drift-disc', 'sha1-ticket-abc')
    await recordDriftOpened('drift-disc', 'sha1-ticket-def')
    await recordDiscoveredNew('drift-disc', 'hash-of-path-xyz')
    await finishRun({ runId: 'drift-disc' })

    const data = (await getFirestore().collection('pipeline_runs').doc('drift-disc').get()).data()!
    expect(data.drift_opened.sort()).toEqual(['sha1-ticket-abc', 'sha1-ticket-def'])
    expect(data.discovered_new).toEqual(['hash-of-path-xyz'])
    expect(data.summary.schema_drift_opened).toBe(2)
    expect(data.summary.discovered_files_new).toBe(1)
  })
})
