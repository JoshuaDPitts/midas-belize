import crypto from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import { NotFoundError, RateLimitError, UpstreamError } from '@/app/api/_lib/errors'
import { checkRateLimit } from '@/app/api/_lib/rateLimit'

const RATE_OPTS = { bucketSize: 10, windowMs: 60 * 60 * 1000 }

export const POST = withRouteHandler<{ dataset: string }>(async (req: NextRequest, ctx) => {
  const rl = await checkRateLimit(req, RATE_OPTS)
  if (!rl.allowed) throw new RateLimitError('rerun quota exceeded', rl.retryAfter)

  const { dataset: datasetId } = await ctx.params
  const datasetSnap = await db.collection('datasets').doc(datasetId).get()
  if (!datasetSnap.exists) throw new NotFoundError(`dataset ${datasetId} not found`)

  const runId = `rerun-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`
  await db.collection('pipeline_runs').doc(runId).set({
    triggered_by: 'dataset-rerun',
    started_at: Timestamp.now(),
    status: 'running',
    github_run_url: '',
    summary: {
      datasets_total: 1,
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

  const token = process.env.GITHUB_DISPATCH_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!token || !owner || !repo) {
    throw new UpstreamError('GitHub dispatch credentials not configured')
  }

  const dispatchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: 'rerun',
        client_payload: { dataset_id: datasetId, run_id: runId },
      }),
    },
  )
  if (!dispatchRes.ok && dispatchRes.status !== 204) {
    await db.collection('pipeline_runs').doc(runId).update({
      status: 'failed',
      error_summary: `GitHub dispatch failed: ${dispatchRes.status}`,
    })
    throw new UpstreamError(`GitHub dispatch failed: ${dispatchRes.status}`)
  }

  return NextResponse.json(
    { run_id: runId, github_run_url: null, status: 'queued' },
    { status: 200, headers: { 'Cache-Control': 'no-cache' } },
  )
})
