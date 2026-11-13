import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { diffHeader, recordDrift } from '../../../scripts/pre-process/diff'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

describe('recordDrift', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    const snap = await db.collection('schema_drift').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  it('creates a new schema_drift ticket and increments occurrence_count on repeat', async () => {
    const diff = diffHeader(
      ['poly_id', 'BIN_ID', 'BIN_Label', 'Pixel_Count', 'Clade_1_pct'],
      {
        required: ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count'],
        optional: [],
        patterns: [/^Clade_\d+_pct$/],
      },
    )
    expect(diff.isBreaking).toBe(true)
    expect(diff.missing_required).toEqual(['Polygon_ID'])

    const firstId = await recordDrift({
      schemaId: 'mimes-polygon-detail',
      schemaVersion: 1,
      diff,
      sourceFilePath: 'raw/x.csv',
      sampleRows: [{ poly_id: '1' }],
      affectedDatasets: ['placencia-30polygons-coral-cover'],
      runId: 'run-1',
    })

    const db = getFirestore()
    const first = await db.collection('schema_drift').doc(firstId).get()
    expect(first.exists).toBe(true)
    const firstData = first.data()!
    expect(firstData.occurrence_count).toBe(1)
    expect(firstData.status).toBe('open')
    expect(firstData.affected_datasets).toEqual(['placencia-30polygons-coral-cover'])
    expect(firstData.first_seen_in_run).toBe('run-1')
    expect(firstData.last_seen_in_run).toBe('run-1')

    const secondId = await recordDrift({
      schemaId: 'mimes-polygon-detail',
      schemaVersion: 1,
      diff,
      sourceFilePath: 'raw/x.csv',
      sampleRows: [{ poly_id: '2' }],
      affectedDatasets: ['placencia-30polygons-coral-cover', 'cayecaulker-marine'],
      runId: 'run-2',
    })
    expect(secondId).toBe(firstId)

    const second = await db.collection('schema_drift').doc(firstId).get()
    const secondData = second.data()!
    expect(secondData.occurrence_count).toBe(2)
    expect(secondData.last_seen_in_run).toBe('run-2')
    expect(secondData.first_seen_in_run).toBe('run-1')
    expect(secondData.affected_datasets.sort()).toEqual([
      'cayecaulker-marine',
      'placencia-30polygons-coral-cover',
    ])
  })

  it('creates distinct tickets for different schema drift fingerprints', async () => {
    const spec = {
      required: ['Polygon_ID', 'BIN_ID', 'BIN_Label', 'Pixel_Count'],
      optional: [],
      patterns: [/^Clade_\d+_pct$/],
    }
    const diffA = diffHeader(['BIN_ID', 'BIN_Label', 'Pixel_Count'], spec)
    const diffB = diffHeader(['Polygon_ID', 'BIN_Label', 'Pixel_Count'], spec)

    const idA = await recordDrift({
      schemaId: 'mimes-polygon-detail',
      schemaVersion: 1,
      diff: diffA,
      sourceFilePath: 'raw/a.csv',
      sampleRows: [],
      affectedDatasets: ['x'],
      runId: 'run-1',
    })
    const idB = await recordDrift({
      schemaId: 'mimes-polygon-detail',
      schemaVersion: 1,
      diff: diffB,
      sourceFilePath: 'raw/b.csv',
      sampleRows: [],
      affectedDatasets: ['y'],
      runId: 'run-1',
    })

    expect(idA).not.toBe(idB)
    const db = getFirestore()
    const all = await db.collection('schema_drift').get()
    expect(all.size).toBe(2)
  })

  it('caps sample_rows at 10 even when more are supplied', async () => {
    const spec = {
      required: ['Polygon_ID'],
      optional: [],
      patterns: [],
    }
    const diff = diffHeader(['wrong_id'], spec)
    const samples = Array.from({ length: 25 }, (_, i) => ({ wrong_id: String(i) }))

    const ticketId = await recordDrift({
      schemaId: 'test-schema',
      schemaVersion: 1,
      diff,
      sourceFilePath: 'raw/cap.csv',
      sampleRows: samples,
      affectedDatasets: ['test'],
      runId: 'run-1',
    })

    const db = getFirestore()
    const data = (await db.collection('schema_drift').doc(ticketId).get()).data()!
    expect(data.sample_rows).toHaveLength(10)
    expect(data.sample_rows[0]).toEqual({ wrong_id: '0' })
    expect(data.sample_rows[9]).toEqual({ wrong_id: '9' })
  })
})
