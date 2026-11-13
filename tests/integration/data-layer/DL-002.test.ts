import { describe, it, expect, beforeAll } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('DL-002: GCS bucket smoke', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  it('can write + read an object with correct content-type + cache-control', async () => {
    const bucket = getStorage().bucket()
    const file = bucket.file('test-lifecycle/v1.txt')
    await file.save(Buffer.from('hello'), {
      contentType: 'text/plain',
      resumable: false,
      metadata: { cacheControl: 'public, max-age=31536000, immutable' },
    })
    const [metadata] = await file.getMetadata()
    expect(metadata.contentType).toBe('text/plain')
    expect(metadata.cacheControl).toBe('public, max-age=31536000, immutable')
    await file.delete()
  })

  it('can list objects under a prefix', async () => {
    const bucket = getStorage().bucket()
    await bucket.file('a/1.txt').save('x', { resumable: false })
    await bucket.file('a/2.txt').save('x', { resumable: false })
    const [files] = await bucket.getFiles({ prefix: 'a/' })
    expect(files.length).toBe(2)
    for (const f of files) await f.delete()
  })
})
