import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
import { csvPolygonJoinConverter } from '../../../scripts/pre-process/converters/csv-polygon-join'
import type { FileGroup } from '../../../scripts/pre-process/types'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('csvPolygonJoinConverter', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const db = getFirestore()
    const snap = await db.collection('datasets').get()
    for (const d of snap.docs) {
      const vs = await d.ref.collection('versions').get()
      for (const v of vs.docs) await v.ref.delete()
      await d.ref.delete()
    }
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles()
    for (const f of files) await f.delete()
  })

  async function seedPolygonGrid() {
    const db = getFirestore()
    const bucket = getStorage().bucket()
    const fc = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { Polygon_ID: 1 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-88.4, 16.5],
                [-88.3, 16.5],
                [-88.3, 16.6],
                [-88.4, 16.6],
                [-88.4, 16.5],
              ],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { Polygon_ID: 2 },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [-88.3, 16.5],
                [-88.2, 16.5],
                [-88.2, 16.6],
                [-88.3, 16.6],
                [-88.3, 16.5],
              ],
            ],
          },
        },
      ],
    }
    const gcsPath = 'placencia-30polygons-shape/v2026-04-22-aaaaaaa.geojson'
    await bucket.file(gcsPath).save(Buffer.from(JSON.stringify(fc)))
    await db.collection('datasets').doc('placencia-30polygons-shape').set({
      id: 'placencia-30polygons-shape',
      layer: 'x',
      title: 't',
      description: 't',
      family: 'polygon-grid',
      schema_id: 'polygon-grid',
      schema_version: 1,
      scope: 'site',
      sites: ['placencia'],
      visible_at: ['placencia'],
      tags: [],
      current_version: {
        version: 'v2026-04-22-aaaaaaa',
        gcs_path: gcsPath,
        content_type: 'application/geo+json',
        size_bytes: 100,
        bbox: [-88.4, 16.5, -88.2, 16.6],
        published_at: Timestamp.now(),
        pipeline_run_id: 'r',
      },
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      status: 'published',
      last_upstream_mtime: Timestamp.now(),
      last_processed_at: Timestamp.now(),
      created_at: Timestamp.now(),
      updated_at: Timestamp.now(),
    })
  }

  function mkGroup(provenanceJson: object): FileGroup {
    return {
      primary: {
        path: 'raw/x.csv',
        relativePath: 'x.csv',
        ext: '.csv',
        size_bytes: 1,
        mtime: new Date(0),
      },
      sidecars: [],
      provenanceFile: {
        path: 'raw/x.provenance.json',
        relativePath: 'x.provenance.json',
        ext: '.json',
        size_bytes: JSON.stringify(provenanceJson).length,
        mtime: new Date(0),
      },
    }
  }

  it('matches when provenance.json has join_to + join_key', () => {
    const group = mkGroup({ join_to: 'placencia-30polygons-shape', join_key: 'Polygon_ID' })
    ;(group as any)._provenance = {
      join_to: 'placencia-30polygons-shape',
      join_key: 'Polygon_ID',
    }
    expect(csvPolygonJoinConverter.match(group)).toBe(true)
  })

  it('does not match when join_to is absent', () => {
    const group = mkGroup({})
    ;(group as any)._provenance = {}
    expect(csvPolygonJoinConverter.match(group)).toBe(false)
  })

  it('joins CSV rows to polygons by Polygon_ID', async () => {
    await seedPolygonGrid()

    const csv = 'Polygon_ID,nbs_score\n1,0.75\n2,0.40\n'
    const readFile = async (p: string) => {
      if (p.endsWith('x.csv')) return Buffer.from(csv)
      throw new Error(`unexpected read: ${p}`)
    }

    const group = mkGroup({ join_to: 'placencia-30polygons-shape', join_key: 'Polygon_ID' })
    ;(group as any)._provenance = {
      join_to: 'placencia-30polygons-shape',
      join_key: 'Polygon_ID',
    }

    const asset = await csvPolygonJoinConverter.convert(group, {
      datasetId: 'placencia-30polygons-nbs',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      readFile,
    })

    const fc = JSON.parse(asset.bytes.toString('utf-8'))
    expect(fc.type).toBe('FeatureCollection')
    expect(fc.features).toHaveLength(2)
    const f1 = fc.features.find((f: any) => f.properties.Polygon_ID === 1)!
    expect(f1.properties.nbs_score).toBe('0.75')
    expect(f1.geometry.type).toBe('Polygon')
    expect(asset.feature_count).toBe(2)
  })

  it('unmatched Polygon_IDs produce a warning, not a failure', async () => {
    await seedPolygonGrid()
    const csv = 'Polygon_ID,nbs_score\n1,0.75\n99,0.99\n'
    const readFile = async () => Buffer.from(csv)
    const group = mkGroup({ join_to: 'placencia-30polygons-shape', join_key: 'Polygon_ID' })
    ;(group as any)._provenance = {
      join_to: 'placencia-30polygons-shape',
      join_key: 'Polygon_ID',
    }

    const warnings: string[] = []
    const origWarn = console.warn
    console.warn = (msg: string) => {
      warnings.push(msg)
    }
    try {
      const asset = await csvPolygonJoinConverter.convert(group, {
        datasetId: 'x',
        provenance: {
          source: 's',
          source_url: null,
          license: 'l',
          citation: 'c',
          upstream_paths: ['x'],
        },
        readFile,
      })
      const fc = JSON.parse(asset.bytes.toString('utf-8'))
      expect(fc.features).toHaveLength(1)
      expect(warnings.some((w) => w.includes('99'))).toBe(true)
    } finally {
      console.warn = origWarn
    }
  })
})
