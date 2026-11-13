import { describe, it, expect, beforeAll } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('Firebase Emulator Suite smoke', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  it('can round-trip a Firestore doc through the emulator', async () => {
    const db = getFirestore()
    const ref = db.collection('smoke').doc('t1')
    await ref.set({ hello: 'world' })
    const snap = await ref.get()
    expect(snap.exists).toBe(true)
    expect(snap.data()).toEqual({ hello: 'world' })
    await ref.delete()
  })

  it('can upload + download a small object via the storage emulator', async () => {
    const bucket = getStorage().bucket()
    const file = bucket.file('smoke.txt')
    await file.save(Buffer.from('hello'), { contentType: 'text/plain', resumable: false })
    const [contents] = await file.download()
    expect(contents.toString()).toBe('hello')
    await file.delete()
  })
})
