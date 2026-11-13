import crypto from 'node:crypto'
import { Timestamp, FieldValue } from 'firebase-admin/firestore'
import { db } from './firebase-admin'
import type { DetectedFile } from './types'

function hashPath(p: string): string {
  return crypto.createHash('sha1').update(p).digest('hex')
}

export async function recordDiscovered(
  file: DetectedFile,
  runId: string,
  sampleBytes?: Buffer,
): Promise<void> {
  const id = hashPath(file.path)
  const ref = db.collection('discovered_files').doc(id)
  const existing = await ref.get()
  const now = Timestamp.now()

  if (existing.exists) {
    await ref.update({
      last_seen: now,
      seen_in_runs: FieldValue.arrayUnion(runId),
    })
    return
  }

  const sample_bytes_base64 =
    sampleBytes && sampleBytes.byteLength <= 1024 ? sampleBytes.toString('base64') : null

  await ref.set({
    path: file.path,
    ext: file.ext,
    mime: '',
    size_bytes: file.size_bytes,
    first_seen: now,
    last_seen: now,
    seen_in_runs: [runId],
    sample_bytes_base64,
    status: 'unrecognized',
  })
}
