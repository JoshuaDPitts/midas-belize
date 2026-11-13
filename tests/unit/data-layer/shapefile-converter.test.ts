import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import { shapefileConverter } from '../../../scripts/pre-process/converters/shapefile'
import {
  clearRegistry,
  register,
  findHandler,
} from '../../../scripts/pre-process/registry'
import type { DetectedFile, FileGroup } from '../../../scripts/pre-process/types'

const FIXTURE_DIR = path.join(__dirname, '../../fixtures/data-layer/tiny-polygon')

function mkFile(p: string, size = 100): DetectedFile {
  return {
    path: p,
    relativePath: p,
    ext: path.extname(p).toLowerCase(),
    size_bytes: size,
    mtime: new Date(),
  }
}

describe('shapefileConverter', () => {
  beforeEach(() => {
    clearRegistry()
    register(shapefileConverter)
  })

  it('matches a group with .shp + .shx + .dbf sidecars', () => {
    const group: FileGroup = {
      primary: mkFile('tiny.shp'),
      sidecars: [mkFile('tiny.shx'), mkFile('tiny.dbf'), mkFile('tiny.prj')],
      provenanceFile: null,
    }
    expect(findHandler(group)?.id).toBe('shapefile')
  })

  it('does not match bare .shp (missing sidecars)', () => {
    const group: FileGroup = {
      primary: mkFile('tiny.shp'),
      sidecars: [],
      provenanceFile: null,
    }
    expect(findHandler(group)).toBeNull()
  })

  it('converts tiny fixture shapefile to valid FeatureCollection GeoJSON', async () => {
    const readFile = (p: string) => fs.readFile(path.join(FIXTURE_DIR, path.basename(p)))
    const group: FileGroup = {
      primary: mkFile(path.join(FIXTURE_DIR, 'tiny.shp')),
      sidecars: [
        mkFile(path.join(FIXTURE_DIR, 'tiny.shx')),
        mkFile(path.join(FIXTURE_DIR, 'tiny.dbf')),
        mkFile(path.join(FIXTURE_DIR, 'tiny.prj')),
      ],
      provenanceFile: null,
    }
    const ctx = {
      datasetId: 'tiny',
      provenance: {
        source: 'test',
        source_url: null,
        license: 'test',
        citation: 'test',
        upstream_paths: ['tiny.shp'],
      },
      readFile,
    }
    const asset = await shapefileConverter.convert(group, ctx)

    expect(asset.contentType).toBe('application/geo+json')
    expect(asset.extension).toBe('.geojson')

    const fc = JSON.parse(asset.bytes.toString('utf-8'))
    expect(fc.type).toBe('FeatureCollection')
    expect(Array.isArray(fc.features)).toBe(true)
    expect(fc.features.length).toBeGreaterThan(0)

    for (const feat of fc.features) {
      expect(feat.properties.source).toBe('test')
      expect(feat.properties.license).toBe('test')
    }

    expect(asset.feature_count).toBe(fc.features.length)
    expect(asset.bbox).toHaveLength(4)
  })

  it('rejects empty shapefile with clear error', async () => {
    const readFile = async () => Buffer.from('not a shapefile')
    const group: FileGroup = {
      primary: mkFile('empty.shp'),
      sidecars: [mkFile('empty.shx'), mkFile('empty.dbf')],
      provenanceFile: null,
    }
    const ctx = {
      datasetId: 't',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['empty.shp'],
      },
      readFile,
    }
    await expect(shapefileConverter.convert(group, ctx)).rejects.toThrow(/shapefile/i)
  })
})
