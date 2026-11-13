import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { defineSecret, defineString } from 'firebase-functions/params'
import { google, type drive_v3 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import * as admin from 'firebase-admin'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { pollDriveOnce, dispatchGithub } from './shared/drive-poller'
import { mirrorChangesToGcs, makePathResolver } from './shared/drive-mirror'
import { sendSlackAlert } from './shared/alert-on-failure'
import {
  isOAuthAuthError,
  recordOAuthSuccess,
  recordOAuthFailure,
  buildOAuthFailureMessage,
} from './shared/drive-auth-monitor'

if (admin.apps.length === 0) admin.initializeApp()

// Secrets — created via \`firebase functions:secrets:set NAME\` before deploy.
const DRIVE_SERVICE_ACCOUNT_KEY = defineSecret('DRIVE_SERVICE_ACCOUNT_KEY')
// Comma-separated Shared Drive IDs reachable via the SA (drive-poller@…)
// — needs SA added as Content manager on each.
const DRIVE_SA_FOLDER_IDS = defineSecret('DRIVE_SA_FOLDER_IDS')
// Comma-separated Shared Drive IDs reachable only via user-delegated
// OAuth (the user's personal Google account).
const DRIVE_OAUTH_FOLDER_IDS = defineSecret('DRIVE_OAUTH_FOLDER_IDS')
const DRIVE_OAUTH_CLIENT_ID = defineSecret('DRIVE_OAUTH_CLIENT_ID')
const DRIVE_OAUTH_CLIENT_SECRET = defineSecret('DRIVE_OAUTH_CLIENT_SECRET')
const DRIVE_OAUTH_REFRESH_TOKEN = defineSecret('DRIVE_OAUTH_REFRESH_TOKEN')
const GITHUB_DISPATCH_TOKEN = defineSecret('GITHUB_DISPATCH_TOKEN')
const SLACK_ALERT_WEBHOOK = defineSecret('SLACK_ALERT_WEBHOOK')

const GITHUB_REPO_OWNER = defineString('GITHUB_REPO_OWNER', { default: '' })
const GITHUB_REPO_NAME = defineString('GITHUB_REPO_NAME', { default: '' })

const BUCKET = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'midas-data'

function parseList(value: string | undefined): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function buildServiceAccountDriveClient(): Promise<drive_v3.Drive> {
  const keyB64 = DRIVE_SERVICE_ACCOUNT_KEY.value()
  if (!keyB64) throw new Error('DRIVE_SERVICE_ACCOUNT_KEY secret missing')
  const creds = JSON.parse(Buffer.from(keyB64, 'base64').toString('utf-8')) as {
    client_email: string
    private_key: string
  }
  const auth = new google.auth.JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  })
  await auth.authorize()
  return google.drive({ version: 'v3', auth })
}

function buildOAuthDriveClient(opts: {
  clientId: string
  clientSecret: string
  refreshToken: string
}): drive_v3.Drive {
  const oauth = new OAuth2Client(opts.clientId, opts.clientSecret)
  oauth.setCredentials({ refresh_token: opts.refreshToken })
  // googleapis Drive accepts an OAuth2Client as auth.
  return google.drive({ version: 'v3', auth: oauth })
}

async function pollAndMirror(opts: {
  driveId: string
  drive: drive_v3.Drive
  bucket: ReturnType<ReturnType<typeof getStorage>['bucket']>
}): Promise<{ initialized: boolean; changedFiles: string[] }> {
  const { driveId, drive, bucket } = opts
  const result = await pollDriveOnce({
    folderId: driveId,
    driveId,
    driveClient: drive,
  })

  if (result.initialized) {
    logger.info(`[${driveId}] state initialized; skipping this poll`)
    return { initialized: true, changedFiles: [] }
  }
  if (result.changedPaths.length === 0) {
    logger.info(`[${driveId}] no changes since last poll`)
    return { initialized: false, changedFiles: [] }
  }

  logger.info(`[${driveId}] ${result.changedPaths.length} changed file(s)`)
  const resolver = makePathResolver(drive, driveId)
  const mirrorResult = await mirrorChangesToGcs({
    changes: result.changedPaths,
    bucket,
    drive,
    resolvePath: async (id) => `${driveId}/${await resolver.pathOf(id)}`,
  })
  logger.info(
    `[${driveId}] mirror: +${mirrorResult.uploaded} · -${mirrorResult.deleted} · ~${mirrorResult.skipped}`,
  )

  const changedFiles = result.changedPaths.map((c) => `${driveId}/${c.name}`)
  return { initialized: false, changedFiles }
}

export const driveWatcher = onSchedule(
  {
    // Weekly cadence — Mondays 12:00 UTC. Was 'every 15 minutes' originally,
    // which generated ~96 dispatches/day and exposed cost compounding when
    // GHA billing went sideways (2026-05-14): every poll fired a
    // repository_dispatch that GHA accepted-then-failed in seconds, piling
    // up red rows. Manual GHA dispatches are still available via
    // `gh workflow run preprocess.yml --ref main` if you need to seed
    // between weekly polls.
    schedule: '0 12 * * 1',
    timeZone: 'UTC',
    region: 'us-central1',
    retryCount: 1,
    secrets: [
      DRIVE_SERVICE_ACCOUNT_KEY,
      DRIVE_SA_FOLDER_IDS,
      DRIVE_OAUTH_FOLDER_IDS,
      DRIVE_OAUTH_CLIENT_ID,
      DRIVE_OAUTH_CLIENT_SECRET,
      DRIVE_OAUTH_REFRESH_TOKEN,
      GITHUB_DISPATCH_TOKEN,
      SLACK_ALERT_WEBHOOK,
    ],
  },
  async () => {
    const saIds = parseList(DRIVE_SA_FOLDER_IDS.value())
    const oauthIds = parseList(DRIVE_OAUTH_FOLDER_IDS.value())
    if (saIds.length === 0 && oauthIds.length === 0) {
      logger.error('No drive IDs configured (DRIVE_SA_FOLDER_IDS + DRIVE_OAUTH_FOLDER_IDS empty)')
      return
    }

    process.env.GITHUB_REPO_OWNER = GITHUB_REPO_OWNER.value()
    process.env.GITHUB_REPO_NAME = GITHUB_REPO_NAME.value()
    process.env.GITHUB_DISPATCH_TOKEN = GITHUB_DISPATCH_TOKEN.value()

    const bucket = getStorage().bucket(BUCKET)
    const aggregated: string[] = []
    let anyInitialized = false

    // --- Service-account drives ---
    if (saIds.length > 0) {
      const saDrive = await buildServiceAccountDriveClient()
      for (const id of saIds) {
        try {
          const r = await pollAndMirror({ driveId: id, drive: saDrive, bucket })
          if (r.initialized) anyInitialized = true
          aggregated.push(...r.changedFiles)
        } catch (err) {
          logger.error(`[${id}] SA poll failed: ${(err as Error).message}`)
          // Don't let one drive's failure block the others.
        }
      }
    }

    // --- OAuth user-delegated drives ---
    if (oauthIds.length > 0) {
      const clientId = DRIVE_OAUTH_CLIENT_ID.value()
      const clientSecret = DRIVE_OAUTH_CLIENT_SECRET.value()
      const refreshToken = DRIVE_OAUTH_REFRESH_TOKEN.value()
      if (!clientId || !clientSecret || !refreshToken) {
        logger.warn('OAuth secrets missing; skipping OAuth drives')
      } else {
        const oauthDrive = buildOAuthDriveClient({ clientId, clientSecret, refreshToken })
        let oauthSawError: Error | null = null
        for (const id of oauthIds) {
          try {
            const r = await pollAndMirror({ driveId: id, drive: oauthDrive, bucket })
            if (r.initialized) anyInitialized = true
            aggregated.push(...r.changedFiles)
          } catch (err) {
            const e = err as Error
            logger.error(`[${id}] OAuth poll failed: ${e.message}`)
            if (isOAuthAuthError(e)) {
              oauthSawError = e
              // Auth is broken globally for the OAuth path — stop trying
              // the rest of the OAuth drives this poll.
              break
            }
          }
        }

        const db = getFirestore()
        if (oauthSawError) {
          const { shouldAlert, health } = await recordOAuthFailure({
            db,
            now: Timestamp.now(),
            error: oauthSawError,
          })
          if (shouldAlert) {
            const webhook = SLACK_ALERT_WEBHOOK.value()
            if (webhook) {
              try {
                await sendSlackAlert({
                  webhookUrl: webhook,
                  message: buildOAuthFailureMessage({ error: oauthSawError, health }),
                })
                logger.info('Slack alert sent: OAuth auth failure')
              } catch (slackErr) {
                logger.error(`Slack alert failed: ${(slackErr as Error).message}`)
              }
            } else {
              logger.warn('SLACK_ALERT_WEBHOOK missing; cannot alert on OAuth failure')
            }
          } else {
            logger.info('OAuth failure within cooldown; suppressing alert')
          }
        } else {
          await recordOAuthSuccess(db, Timestamp.now())
        }
      }
    }

    if (aggregated.length === 0) {
      if (anyInitialized) logger.info('At least one drive newly initialized; no dispatch')
      else logger.info('All drives polled; no changes to dispatch')
      return
    }
    await dispatchGithub({ changedFiles: aggregated })
    logger.info(`Fired repository_dispatch with ${aggregated.length} changed file(s)`)
  },
)
