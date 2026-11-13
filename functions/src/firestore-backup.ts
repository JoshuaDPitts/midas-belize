import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import * as admin from 'firebase-admin'
import { v1 as firestoreAdmin } from '@google-cloud/firestore'

if (admin.apps.length === 0) admin.initializeApp()

const BUCKET = process.env.BACKUP_BUCKET ?? 'midas-data'

const BACKUP_COLLECTIONS = [
  'datasets',
  'schemas',
  'schema_drift',
  'discovered_files',
  'pipeline_runs',
]

export const firestoreBackup = onSchedule(
  {
    schedule: '0 3 * * *',
    timeZone: 'UTC',
    region: 'us-central1',
    retryCount: 1,
  },
  async () => {
    const client = new firestoreAdmin.FirestoreAdminClient()
    const projectId = process.env.GCLOUD_PROJECT
    if (!projectId) {
      throw new Error('GCLOUD_PROJECT env var is missing; required for Firestore admin path.')
    }
    const databaseName = client.databasePath(projectId, '(default)')
    const date = new Date().toISOString().slice(0, 10)
    const outputUri = `gs://${BUCKET}/_meta/catalog-snapshot-${date}`

    logger.info(`Exporting Firestore to ${outputUri}`, { collections: BACKUP_COLLECTIONS })
    const [op] = await client.exportDocuments({
      name: databaseName,
      outputUriPrefix: outputUri,
      collectionIds: BACKUP_COLLECTIONS,
    })
    logger.info(`Export started`, { operation: op.name })
  },
)
