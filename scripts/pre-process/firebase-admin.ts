import { initializeApp, getApps, cert, applicationDefault } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'

if (process.env.USE_EMULATORS === '1') {
  process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'
}

const BUCKET_NAME = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'midas-data'
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'midas-belize-prod'

if (getApps().length === 0) {
  const options: Parameters<typeof initializeApp>[0] = {
    projectId: PROJECT_ID,
    storageBucket: BUCKET_NAME,
  }

  if (process.env.USE_EMULATORS !== '1') {
    options.credential = process.env.GOOGLE_APPLICATION_CREDENTIALS
      ? cert(process.env.GOOGLE_APPLICATION_CREDENTIALS)
      : applicationDefault()
  }

  initializeApp(options)
}

export const db = getFirestore()
export const bucket = getStorage().bucket()
