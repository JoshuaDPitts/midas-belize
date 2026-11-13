import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('firebase-admin init', () => {
  beforeEach(() => {
    vi.resetModules()
    delete process.env.USE_EMULATORS
    delete process.env.FIRESTORE_EMULATOR_HOST
    delete process.env.FIREBASE_STORAGE_EMULATOR_HOST
  })

  it('sets emulator host envs when USE_EMULATORS=1', async () => {
    process.env.USE_EMULATORS = '1'
    await import('@/lib/data/firebase-admin')
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBe('localhost:8080')
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBe('localhost:9199')
  })

  it('does not set emulator envs when USE_EMULATORS is absent', async () => {
    await import('@/lib/data/firebase-admin')
    expect(process.env.FIRESTORE_EMULATOR_HOST).toBeUndefined()
    expect(process.env.FIREBASE_STORAGE_EMULATOR_HOST).toBeUndefined()
  })
})
