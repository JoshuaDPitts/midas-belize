import { Timestamp } from 'firebase-admin/firestore'
import { db } from './firebase-admin'
import { ACTIVE_SITES } from './sites'
import type { CatalogEntry } from '@/lib/data/types'

export async function rebuildVisibleAt(): Promise<{ updated: number; scanned: number }> {
  const snap = await db.collection('datasets').get()
  let updated = 0
  for (const doc of snap.docs) {
    const entry = doc.data() as CatalogEntry
    const desired = entry.scope === 'national' ? [...ACTIVE_SITES] : [...entry.sites]
    const current = entry.visible_at ?? []
    const unchanged =
      desired.length === current.length && desired.every((s) => current.includes(s))
    if (!unchanged) {
      await doc.ref.update({ visible_at: desired, updated_at: Timestamp.now() })
      updated++
    }
  }
  return { updated, scanned: snap.size }
}
