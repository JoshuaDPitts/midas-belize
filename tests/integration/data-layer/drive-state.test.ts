import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  claimNextPoll,
  updatePollResult,
  getDriveState,
} from '../../../scripts/pre-process/drive-state'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

/**
 * Seed a drive_state doc and verify it's readable before returning.
 * The Firestore emulator's transaction layer has visibility quirks
 * with fresh writes — a following `runTransaction.tx.get()` may see
 * !exists even right after `await set(...)`. Gating on a read-back
 * resolves the race.
 */
async function seedDriveState(
  folderId: string,
  data: { startPageToken: string | null; last_poll_at: Timestamp },
) {
  const ref = getFirestore().collection('drive_state').doc(folderId)
  await ref.set(data)
  for (let i = 0; i < 20; i++) {
    const snap = await ref.get()
    if (snap.exists && snap.data()?.startPageToken === data.startPageToken) return
    await new Promise((r) => setTimeout(r, 25))
  }
}

describe('drive-state', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('drive_state').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  describe('claimNextPoll', () => {
    it('first call for a new folder succeeds with null token; caller initializes', async () => {
      const r = await claimNextPoll('brand-new-folder', 10_000)
      expect(r.claimed).toBe(true)
      expect(r.startPageToken).toBeNull()
      // Doc is not auto-created — caller must call updatePollResult after fetching
      // the initial page token from the Drive API.
      const state = await getDriveState('brand-new-folder')
      expect(state).toBeNull()
    })

    it('is atomic: parallel calls on the same folder only one wins', async () => {
      await seedDriveState('f', {
        startPageToken: 'tok-1',
        last_poll_at: Timestamp.fromMillis(0),
      })
      const results = await Promise.all([
        claimNextPoll('f', 10_000),
        claimNextPoll('f', 10_000),
        claimNextPoll('f', 10_000),
      ])
      const claimed = results.filter((r) => r.claimed)
      expect(claimed).toHaveLength(1)
      expect(claimed[0].startPageToken).toBe('tok-1')
    })

    it('subsequent call outside the interval window is allowed', async () => {
      await seedDriveState('f', {
        startPageToken: 'tok-1',
        last_poll_at: Timestamp.fromMillis(Date.now() - 60_000),
      })
      const r = await claimNextPoll('f', 10_000)
      expect(r.claimed).toBe(true)
      expect(r.startPageToken).toBe('tok-1')
    })

    it('returns claimed=false when the interval window blocks', async () => {
      await seedDriveState('f', {
        startPageToken: 'tok-1',
        last_poll_at: Timestamp.now(),
      })
      const r = await claimNextPoll('f', 10_000)
      expect(r.claimed).toBe(false)
    })
  })

  describe('updatePollResult', () => {
    it('persists the new page token + optional run id', async () => {
      await claimNextPoll('f', 10_000)
      await updatePollResult('f', 'tok-new', { runId: 'run-123' })
      const state = await getDriveState('f')
      expect(state?.startPageToken).toBe('tok-new')
      expect(state?.last_run_id).toBe('run-123')
    })

    it('merges (does not clobber) — can be called without runId', async () => {
      await claimNextPoll('f', 10_000)
      await updatePollResult('f', 'tok-a', { runId: 'run-a' })
      await updatePollResult('f', 'tok-b')
      const state = await getDriveState('f')
      expect(state?.startPageToken).toBe('tok-b')
      expect(state?.last_run_id).toBe('run-a')
    })
  })
})
