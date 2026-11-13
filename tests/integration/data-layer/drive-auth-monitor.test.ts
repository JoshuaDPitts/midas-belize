import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  isOAuthAuthError,
  recordOAuthSuccess,
  recordOAuthFailure,
  buildOAuthFailureMessage,
  OAUTH_HEALTH_DOC_PATH,
} from '../../../scripts/pre-process/drive-auth-monitor'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('isOAuthAuthError', () => {
  it('matches Google auth-error keywords', () => {
    expect(isOAuthAuthError(new Error('invalid_grant: Token has been expired or revoked.'))).toBe(
      true,
    )
    expect(isOAuthAuthError(new Error('invalid_client'))).toBe(true)
    expect(isOAuthAuthError(new Error('unauthorized_client'))).toBe(true)
    expect(isOAuthAuthError(new Error('deleted_client'))).toBe(true)
    expect(isOAuthAuthError(new Error('Token has been expired or revoked'))).toBe(true)
  })

  it('does not match unrelated errors', () => {
    expect(isOAuthAuthError(new Error('Network unreachable'))).toBe(false)
    expect(isOAuthAuthError(new Error('500 Internal Server Error'))).toBe(false)
    expect(isOAuthAuthError(undefined)).toBe(false)
    expect(isOAuthAuthError(null)).toBe(false)
  })
})

describe('drive-auth-monitor Firestore state', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const ref = getFirestore().doc(OAUTH_HEALTH_DOC_PATH)
    await ref.delete().catch(() => {})
  })

  it('recordOAuthSuccess writes status=healthy + zeroed failure_count', async () => {
    const now = Timestamp.now()
    await recordOAuthSuccess(getFirestore(), now)
    const snap = await getFirestore().doc(OAUTH_HEALTH_DOC_PATH).get()
    const d = snap.data()
    expect(d?.status).toBe('healthy')
    expect(d?.failure_count).toBe(0)
    expect((d?.last_success_at as Timestamp).toMillis()).toBe(now.toMillis())
  })

  it('first failure: shouldAlert=true (transition from healthy→failed)', async () => {
    const now = Timestamp.now()
    const r = await recordOAuthFailure({
      db: getFirestore(),
      now,
      error: new Error('invalid_grant'),
    })
    expect(r.shouldAlert).toBe(true)
    expect(r.health.status).toBe('failed')
    expect(r.health.failure_count).toBe(1)
    expect(r.health.last_alert_at?.toMillis()).toBe(now.toMillis())
  })

  it('repeat failure within cooldown: shouldAlert=false, failure_count increments', async () => {
    const t0 = Timestamp.fromMillis(1_000_000_000_000)
    await recordOAuthFailure({
      db: getFirestore(),
      now: t0,
      error: new Error('invalid_grant'),
    })
    const t1 = Timestamp.fromMillis(t0.toMillis() + 60_000) // 1 min later
    const r = await recordOAuthFailure({
      db: getFirestore(),
      now: t1,
      error: new Error('invalid_grant'),
      cooldownMs: 4 * 60 * 60 * 1000,
    })
    expect(r.shouldAlert).toBe(false)
    expect(r.health.failure_count).toBe(2)
    // last_alert_at preserved from first call
    expect(r.health.last_alert_at?.toMillis()).toBe(t0.toMillis())
  })

  it('repeat failure past cooldown: shouldAlert=true again', async () => {
    const t0 = Timestamp.fromMillis(1_000_000_000_000)
    await recordOAuthFailure({
      db: getFirestore(),
      now: t0,
      error: new Error('invalid_grant'),
      cooldownMs: 60_000,
    })
    const t1 = Timestamp.fromMillis(t0.toMillis() + 120_000) // 2 min later, > 60s cooldown
    const r = await recordOAuthFailure({
      db: getFirestore(),
      now: t1,
      error: new Error('invalid_grant'),
      cooldownMs: 60_000,
    })
    expect(r.shouldAlert).toBe(true)
    expect(r.health.last_alert_at?.toMillis()).toBe(t1.toMillis())
  })

  it('success after failure resets state', async () => {
    const t0 = Timestamp.fromMillis(1_000_000_000_000)
    await recordOAuthFailure({
      db: getFirestore(),
      now: t0,
      error: new Error('invalid_grant'),
    })
    const t1 = Timestamp.fromMillis(t0.toMillis() + 1000)
    await recordOAuthSuccess(getFirestore(), t1)
    const snap = await getFirestore().doc(OAUTH_HEALTH_DOC_PATH).get()
    const d = snap.data()
    expect(d?.status).toBe('healthy')
    expect(d?.failure_count).toBe(0)
  })

  it('after a success → failure transition, alert fires immediately (no cooldown)', async () => {
    const t0 = Timestamp.fromMillis(1_000_000_000_000)
    await recordOAuthSuccess(getFirestore(), t0)
    const t1 = Timestamp.fromMillis(t0.toMillis() + 1000)
    const r = await recordOAuthFailure({
      db: getFirestore(),
      now: t1,
      error: new Error('invalid_grant'),
    })
    expect(r.shouldAlert).toBe(true)
  })
})

describe('buildOAuthFailureMessage', () => {
  it('includes the recovery command and error text', () => {
    const msg = buildOAuthFailureMessage({
      error: new Error('invalid_grant: Token has been expired or revoked.'),
      health: {
        status: 'failed',
        failure_count: 3,
        last_failure_at: Timestamp.fromDate(new Date('2026-04-24T12:00:00Z')),
        last_success_at: Timestamp.fromDate(new Date('2026-04-17T12:00:00Z')),
      },
    })
    expect(msg.text).toContain('OAuth auth failed')
    expect(msg.text).toContain('invalid_grant')
    expect(msg.text).toContain('pnpm drive:consent')
    expect(msg.text).toContain('DRIVE_OAUTH_REFRESH_TOKEN')
    expect(msg.text).toContain('Consecutive failures: 3')
    expect(msg.blocks).toHaveLength(1)
    expect(msg.blocks?.[0].type).toBe('section')
  })

  it('handles missing last_success_at gracefully', () => {
    const msg = buildOAuthFailureMessage({
      error: new Error('invalid_grant'),
      health: { status: 'failed', failure_count: 1 },
    })
    expect(msg.text).toContain('Last successful poll: never')
  })
})
