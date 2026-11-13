import { describe, it, expect, beforeAll } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('DL-001: Firestore catalog skeleton', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  it('Admin SDK can write to all six catalog collections', async () => {
    const db = getFirestore()
    for (const col of [
      'datasets',
      'schemas',
      'schema_drift',
      'discovered_files',
      'pipeline_runs',
      'rate_limits',
    ]) {
      await db.collection(col).doc('_smoke').set({ _smoke: true })
      const snap = await db.collection(col).doc('_smoke').get()
      expect(snap.exists).toBe(true)
      await db.collection(col).doc('_smoke').delete()
    }
  })

  it('compound-index-requiring query executes successfully', async () => {
    const db = getFirestore()
    const snap = await db
      .collection('datasets')
      .where('visible_at', 'array-contains', 'placencia')
      .orderBy('updated_at', 'desc')
      .limit(1)
      .get()
    expect(snap.empty).toBe(true)
  })
})
