import { bucket } from './firebase-admin'

const LIFECYCLE_RULES = [
  {
    action: { type: 'Delete' as const },
    condition: {
      age: 90,
      matchesPrefix: ['_meta/pipeline-runs/'],
    },
  },
  {
    action: { type: 'Delete' as const },
    condition: {
      age: 90,
      matchesPrefix: ['_meta/catalog-snapshot-'],
    },
  },
]

const CORS = [
  {
    origin: [
      'https://midas-belize-prod.web.app',
      'https://midas-belize-prod.firebaseapp.com',
      'http://localhost:3000',
    ],
    method: ['GET', 'HEAD'],
    responseHeader: ['Content-Type', 'ETag', 'Cache-Control'],
    maxAgeSeconds: 3600,
  },
]

async function main() {
  const [exists] = await bucket.exists()
  if (!exists) {
    await bucket.create({ location: 'us-central1' })
    console.log(`Created bucket ${bucket.name}`)
  } else {
    console.log(`Bucket ${bucket.name} already exists`)
  }
  await bucket.setMetadata({ lifecycle: { rule: LIFECYCLE_RULES } })
  console.log('Applied lifecycle rules')
  await bucket.setCorsConfiguration(CORS)
  console.log('Applied CORS configuration')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
