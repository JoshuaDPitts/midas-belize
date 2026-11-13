/**
 * OAuth-user auth health tracking for the driveWatcher Cloud Function.
 *
 * The OAuth path (used for Shared Drives the service account can't be
 * added to) issues refresh tokens that expire in 7 days when the
 * OAuth app is in "Testing" status. The Function detects expiry,
 * persists state, and emits a single Slack alert per failure window
 * with a recovery command — instead of paging every 15 minutes.
 *
 * Pure logic; no firebase-admin singletons created at import. Caller
 * passes a Firestore reference + fetch impl so this module is unit-
 * testable against the emulator.
 */

import type { Firestore, Timestamp } from 'firebase-admin/firestore'
import type { SlackMessage } from './alert-on-failure'

export const OAUTH_HEALTH_DOC_PATH = 'drive_auth_state/oauth'
export const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000 // 4h between repeat alerts

export interface OAuthHealth {
  status: 'healthy' | 'failed'
  last_success_at?: Timestamp
  last_failure_at?: Timestamp
  last_error?: string
  failure_count: number
  last_alert_at?: Timestamp
}

export function isOAuthAuthError(err: unknown): boolean {
  if (!err) return false
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  // google-auth-library throws errors whose message contains the
  // OAuth error code returned by the token endpoint.
  return (
    msg.includes('invalid_grant') ||
    msg.includes('invalid_client') ||
    msg.includes('unauthorized_client') ||
    msg.includes('deleted_client') ||
    msg.includes('token has been expired or revoked')
  )
}

export async function recordOAuthSuccess(
  db: Firestore,
  now: Timestamp,
): Promise<void> {
  await db.doc(OAUTH_HEALTH_DOC_PATH).set(
    {
      status: 'healthy',
      last_success_at: now,
      failure_count: 0,
    },
    { merge: true },
  )
}

export interface FailureRecordResult {
  shouldAlert: boolean
  health: OAuthHealth
}

export async function recordOAuthFailure(opts: {
  db: Firestore
  now: Timestamp
  error: Error
  cooldownMs?: number
}): Promise<FailureRecordResult> {
  const cooldown = opts.cooldownMs ?? ALERT_COOLDOWN_MS
  const ref = opts.db.doc(OAUTH_HEALTH_DOC_PATH)
  const snap = await ref.get()
  const prev = (snap.data() as Partial<OAuthHealth> | undefined) ?? {}

  const lastAlertMs = prev.last_alert_at?.toMillis() ?? 0
  const cooldownElapsed = opts.now.toMillis() - lastAlertMs > cooldown
  const transitioning = prev.status !== 'failed'
  const shouldAlert = transitioning || cooldownElapsed

  // Firestore rejects \`undefined\` field values, so build the doc with
  // only defined keys before writing.
  const next: OAuthHealth = {
    status: 'failed',
    last_failure_at: opts.now,
    last_error: opts.error.message,
    failure_count: (prev.failure_count ?? 0) + 1,
  }
  if (prev.last_success_at) next.last_success_at = prev.last_success_at
  const nextAlertAt = shouldAlert ? opts.now : prev.last_alert_at
  if (nextAlertAt) next.last_alert_at = nextAlertAt

  await ref.set(next, { merge: true })
  return { shouldAlert, health: next }
}

export function buildOAuthFailureMessage(opts: {
  error: Error
  health: OAuthHealth
}): SlackMessage {
  const { error, health } = opts
  const lastSuccess = health.last_success_at
    ? health.last_success_at.toDate().toISOString()
    : 'never'
  const text = [
    '*🚨 Midas Drive poller — OAuth auth failed*',
    `Error: \`${error.message}\``,
    `Last successful poll: ${lastSuccess}`,
    `Consecutive failures: ${health.failure_count}`,
    '',
    'This usually means the refresh token expired (7-day limit on apps in Testing).',
    'To recover, run from the repo root:',
    '```',
    'pnpm drive:consent',
    "printf '%s' '<paste-new-refresh-token>' | firebase functions:secrets:set DRIVE_OAUTH_REFRESH_TOKEN --project midas-belize-prod --data-file -",
    '```',
    'Next driveWatcher run will pick up the new token automatically.',
  ].join('\n')

  return {
    text,
    blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }],
  }
}
