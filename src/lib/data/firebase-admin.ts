import { existsSync } from 'node:fs'
import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import type { Bucket } from '@google-cloud/storage'

if (process.env.USE_EMULATORS === '1') {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST =
    process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'
}

function ensureApp() {
  if (getApps().length > 0) return

  const options: Parameters<typeof initializeApp>[0] = {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'midas-belize-prod',
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'midas-data',
  }

  if (process.env.USE_EMULATORS !== '1') {
    // Cloud Run / Functions runtimes auto-inject ADC via the instance service
    // account, so a GOOGLE_APPLICATION_CREDENTIALS path bundled from .env.local
    // won't resolve there. Use cert() only if the file actually exists; if it
    // doesn't, strip the env var so applicationDefault() doesn't try to read
    // it (google-auth-library throws before falling through to metadata auth).
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    if (credPath && existsSync(credPath)) {
      options.credential = cert(credPath)
    } else {
      delete process.env.GOOGLE_APPLICATION_CREDENTIALS
      options.credential = applicationDefault()
    }
  }

  initializeApp(options)
}

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    ensureApp()
    return Reflect.get(getFirestore(), prop, getFirestore())
  },
})

export const bucket = new Proxy({} as Bucket, {
  get(_, prop) {
    ensureApp()
    const b = getStorage().bucket()
    return Reflect.get(b, prop, b)
  },
})
