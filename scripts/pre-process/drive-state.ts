import { getFirestore, Timestamp } from 'firebase-admin/firestore'

// NOTE: this module deliberately does NOT call `initializeApp()` at import time.
// In production, the Firebase Functions runtime initializes the default app.
// In tests, the test setup initializes with a test projectId. Calling
// initializeApp() here races that setup and creates a second, disconnected
// app instance, leading to transactions that can't see writes from the other
// side. Keep init at the call site.

export interface DriveState {
  startPageToken: string | null
  last_poll_at: Timestamp
  last_run_id?: string
}

export interface PollClaim {
  claimed: boolean
  startPageToken: string | null
}

/**
 * Atomically claim the next poll slot for a Drive folder, enforcing a
 * minimum interval between polls. Returns `{claimed: false}` if another
 * process already claimed the slot within the window.
 *
 * First-run behavior: if no drive_state doc exists for this folderId,
 * claims the slot with `startPageToken: null` (caller is expected to
 * fetch a fresh token from the Drive API and call `updatePollResult`
 * to persist it).
 */
export async function claimNextPoll(
  folderId: string,
  minIntervalMs: number,
): Promise<PollClaim> {
  const ref = getFirestore().collection('drive_state').doc(folderId)
  return getFirestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) {
      // First poll on this folder — caller is responsible for initializing via
      // `updatePollResult(folderId, token)` after fetching an initial page token
      // from the Drive API. We don't create the doc here because a racing set()
      // from the caller + our tx.set can overwrite each other.
      return { claimed: true, startPageToken: null }
    }
    const data = snap.data() as DriveState
    const lastPollMs = data.last_poll_at?.toMillis?.() ?? 0
    const since = Date.now() - lastPollMs
    if (since < minIntervalMs) {
      return { claimed: false, startPageToken: null }
    }
    tx.update(ref, { last_poll_at: Timestamp.now() })
    return { claimed: true, startPageToken: data.startPageToken ?? null }
  })
}

/**
 * Persist the updated page token after a successful Drive API query.
 * Optionally record the pipeline run id that consumed this poll.
 */
export async function updatePollResult(
  folderId: string,
  startPageToken: string,
  opts: { runId?: string } = {},
): Promise<void> {
  const ref = getFirestore().collection('drive_state').doc(folderId)
  const update: Record<string, unknown> = {
    startPageToken,
    last_poll_at: Timestamp.now(),
  }
  if (opts.runId) update.last_run_id = opts.runId
  await ref.set(update, { merge: true })
}

export async function getDriveState(folderId: string): Promise<DriveState | null> {
  const snap = await getFirestore().collection('drive_state').doc(folderId).get()
  return snap.exists ? (snap.data() as DriveState) : null
}
