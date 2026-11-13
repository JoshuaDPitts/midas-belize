/**
 * Slack-alerting logic for failed pipeline_runs.
 *
 * The pure functions live here (scripts/pre-process/ so the root
 * node_modules resolves correctly for tests). The Firestore trigger
 * wiring lives in functions/src/alert-on-failure-function.ts as a
 * thin wrapper — imports from here, exports the onDocumentWritten
 * Function.
 */
import type { PipelineRun } from '@/lib/data/types'

export interface SlackMessage {
  text: string
  blocks?: Array<{ type: 'section'; text: { type: 'mrkdwn'; text: string } }>
}

export function buildSlackMessage(runId: string, run: PipelineRun): SlackMessage {
  const s = run.summary
  const lines = [
    `Pipeline run *${runId}* → *${run.status}* (${run.triggered_by})`,
    `• ${s.datasets_published} published · ${s.datasets_skipped_nochange} skipped · *${s.datasets_failed}* failed · ${s.datasets_blocked_by_drift} blocked by drift`,
  ]
  if (s.schema_drift_opened > 0) {
    lines.push(
      `• 🧬 ${s.schema_drift_opened} new schema drift ticket(s) — check /admin/data/drift`,
    )
  }
  if (s.discovered_files_new > 0) {
    lines.push(
      `• 🔍 ${s.discovered_files_new} unrecognized file(s) — check /admin/data/discovered`,
    )
  }
  if (run.error_summary) {
    lines.push(`• Error: ${run.error_summary}`)
  }
  if (run.github_run_url) {
    lines.push(`<${run.github_run_url}|View GitHub Actions log>`)
  }
  const text = lines.join('\n')
  return {
    text,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
  }
}

export interface ShouldAlertOpts {
  before: Pick<PipelineRun, 'status'> | null
  after: Pick<PipelineRun, 'status'> | null
}

/**
 * Decide whether a pipeline_runs onDocumentWritten event should fire a
 * Slack alert. Fires exactly once per failure transition — NOT on
 * deletes, NOT on documents that were already failed (dedup), NOT on
 * non-failed states.
 */
export function shouldAlert(opts: ShouldAlertOpts): boolean {
  const { before, after } = opts
  if (!after) return false // doc deleted
  if (after.status !== 'failed') return false
  if (before?.status === 'failed') return false // already alerted
  return true
}

export interface SendSlackOpts {
  webhookUrl: string
  message: SlackMessage
  fetchImpl?: typeof fetch
}

export async function sendSlackAlert(opts: SendSlackOpts): Promise<void> {
  const fetchImpl = opts.fetchImpl ?? fetch
  const res = await fetchImpl(opts.webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts.message),
  })
  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status}`)
  }
}
