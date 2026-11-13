import { describe, it, expect, beforeEach } from 'vitest'
import { geojsonConverter } from '@/../scripts/pre-process/converters/geojson'
import {
  clearRegistry,
  register,
  findHandler,
} from '@/../scripts/pre-process/registry'
import type { FileGroup } from '@/../scripts/pre-process/types'

function mk(rel: string, ext: string): FileGroup {
  return {
    primary: { path: `raw/${rel}`, relativePath: rel, ext, size_bytes: 1, mtime: new Date(0) },
    sidecars: [],
    provenanceFile: null,
  }
}

const PROV = {
  source: 'SRC',
  source_url: null,
  license: 'LIC',
  citation: 'c',
  upstream_paths: ['x'],
}

describe('geojsonConverter', () => {
  beforeEach(() => {
    clearRegistry()
    register(geojsonConverter)
  })

  it('matches .geojson and .json', () => {
    expect(findHandler(mk('a.geojson', '.geojson'))?.id).toBe('geojson')
    expect(findHandler(mk('a.json', '.json'))?.id).toBe('geojson')
    expect(findHandler(mk('a.csv', '.csv'))).toBeNull()
  })

  it('passes EPSG:4326 input through with provenance injected per feature', async () => {
    const input = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'A' },
          geometry: { type: 'Point', coordinates: [-88.3, 16.5] },
        },
      ],
    }
    const asset = await geojsonConverter.convert(mk('x.geojson', '.geojson'), {
      datasetId: 'test',
      provenance: { ...PROV },
      readFile: async () => Buffer.from(JSON.stringify(input)),
    })

    expect(asset.contentType).toBe('application/geo+json')
    expect(asset.extension).toBe('.geojson')
    expect(asset.feature_count).toBe(1)
    expect(asset.bbox).toEqual([-88.3, 16.5, -88.3, 16.5])

    const out = JSON.parse(asset.bytes.toString('utf-8'))
    expect(out.features[0].properties).toMatchObject({ name: 'A', source: 'SRC', license: 'LIC' })
    expect(out.features[0].geometry.coordinates).toEqual([-88.3, 16.5])
  })

  it('reprojects from EPSG:3857 to EPSG:4326 when crs is declared', async () => {
    const input = {
      type: 'FeatureCollection',
      crs: { type: 'name', properties: { name: 'EPSG:3857' } },
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: { type: 'Point', coordinates: [-9829345, 1859033] },
        },
      ],
    }
    const asset = await geojsonConverter.convert(mk('x.geojson', '.geojson'), {
      datasetId: 't',
      provenance: { ...PROV },
      readFile: async () => Buffer.from(JSON.stringify(input)),
    })

    const out = JSON.parse(asset.bytes.toString('utf-8'))
    const [lon, lat] = out.features[0].geometry.coordinates
    expect(lon).toBeCloseTo(-88.3, 1)
    expect(lat).toBeCloseTo(16.5, 1)
    expect(out.crs).toBeUndefined()
  })

  it('reprojects nested coordinate arrays (Polygon)', async () => {
    const input = {
      type: 'FeatureCollection',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:EPSG::3857' } },
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [-9829345, 1859033],
              [-9829345, 1871380],
              [-9795930, 1871380],
              [-9795930, 1859033],
              [-9829345, 1859033],
            ]],
          },
        },
      ],
    }
    const asset = await geojsonConverter.convert(mk('poly.geojson', '.geojson'), {
      datasetId: 't',
      provenance: { ...PROV },
      readFile: async () => Buffer.from(JSON.stringify(input)),
    })

    const out = JSON.parse(asset.bytes.toString('utf-8'))
    const ring = out.features[0].geometry.coordinates[0]
    expect(ring).toHaveLength(5)
    expect(ring[0][0]).toBeCloseTo(-88.3, 1)
    expect(ring[0][1]).toBeCloseTo(16.5, 1)
  })

  it('rejects invalid GeoJSON with a clear error', async () => {
    await expect(
      geojsonConverter.convert(mk('bad.geojson', '.geojson'), {
        datasetId: 't',
        provenance: { ...PROV },
        readFile: async () => Buffer.from('{"not":"geojson"}'),
      }),
    ).rejects.toThrow(/geojson/i)
  })

  it('rejects malformed JSON with a clear error', async () => {
    await expect(
      geojsonConverter.convert(mk('bad.geojson', '.geojson'), {
        datasetId: 't',
        provenance: { ...PROV },
        readFile: async () => Buffer.from('{ not json at all'),
      }),
    ).rejects.toThrow(/geojson.*invalid json/i)
  })
})
