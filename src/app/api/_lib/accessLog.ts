import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { db } from '@/lib/data/firebase-admin'

const SAMPLE_RATE = 0.01

export async function sampleLogAccess(): Promise<void> {
  if (Math.random() > SAMPLE_RATE) return
  const bucketKey = new Date().toISOString().slice(0, 13)
  try {
    await db
      .collection('access_logs')
      .doc(bucketKey)
      .set(
        {
          hits: FieldValue.increment(Math.round(1 / SAMPLE_RATE)),
          last_updated: Timestamp.now(),
        },
        { merge: true },
      )
  } catch {
    // Non-blocking; never fail the request on logging errors
  }
}
