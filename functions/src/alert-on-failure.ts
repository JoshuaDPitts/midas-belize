import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import {
  shouldAlert,
  buildSlackMessage,
  sendSlackAlert,
} from './shared/alert-on-failure'
import type { PipelineRun } from './shared/lib-data-types'

/**
 * Firestore trigger — fires Slack alert when a pipeline_runs doc
 * transitions into status=failed. Dedup-aware: only alerts on
 * non-failed → failed transitions. Logic lives in shared/alert-on-failure
 * (synced from scripts/pre-process/ at predeploy time).
 */

const SLACK_ALERT_WEBHOOK = defineSecret('SLACK_ALERT_WEBHOOK')

export const alertOnFailure = onDocumentWritten(
  {
    document: 'pipeline_runs/{runId}',
    region: 'us-central1',
    secrets: [SLACK_ALERT_WEBHOOK],
  },
  async (event) => {
    const before = (event.data?.before?.data() as PipelineRun | undefined) ?? null
    const after = (event.data?.after?.data() as PipelineRun | undefined) ?? null

    if (!shouldAlert({ before, after })) return

    const webhook = SLACK_ALERT_WEBHOOK.value()
    if (!webhook) {
      logger.warn('SLACK_ALERT_WEBHOOK not set; skipping alert')
      return
    }

    const runId = event.params.runId
    const message = buildSlackMessage(runId, after!)

    try {
      await sendSlackAlert({ webhookUrl: webhook, message })
      logger.info(`Slack alert sent for run ${runId}`)
    } catch (err) {
      logger.error(`Slack alert failed for run ${runId}: ${(err as Error).message}`)
      throw err
    }
  },
)
