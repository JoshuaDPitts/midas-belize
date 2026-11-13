import proj4 from 'proj4'
import { register } from '../registry'
import type { ConverterHandler } from '../types'

proj4.defs(
  'EPSG:3857',
  '+proj=merc +a=6378137 +b=6378137 +lat_ts=0 +lon_0=0 +x_0=0 +y_0=0 +k=1 +units=m +nadgrids=@null +wktext +no_defs',
)

type Position = number[]
type Coordinates = Position | Coordinates[]

interface Geometry {
  type: string
  coordinates?: Coordinates
}

interface Feature {
  type: 'Feature'
  geometry: Geometry | null
  properties: Record<string, unknown> | null
}

interface FeatureCollection {
  type: 'FeatureCollection'
  features: Feature[]
  crs?: { type: string; properties: { name: string } }
  [k: string]: unknown
}

function extractSourceCrs(fc: FeatureCollection): string | null {
  const name = fc.crs?.properties?.name
  if (!name) return null
  if (
    name === 'EPSG:4326' ||
    name === 'urn:ogc:def:crs:OGC:1.3:CRS84' ||
    name === 'urn:ogc:def:crs:EPSG::4326'
  ) {
    return null
  }
  const match = name.match(/EPSG::?(\d+)/)
  return match ? `EPSG:${match[1]}` : name
}

function isPosition(c: Coordinates): c is Position {
  return typeof c[0] === 'number'
}

function reprojectCoords(coords: Coordinates, from: string): Coordinates {
  if (isPosition(coords)) {
    const [x, y] = proj4(from, 'EPSG:4326', [coords[0], coords[1]])
    return coords.length > 2 ? [x, y, coords[2]] : [x, y]
  }
  return coords.map((c) => reprojectCoords(c, from))
}

function computeBbox(features: Feature[]): [number, number, number, number] {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  const visit = (c: Coordinates): void => {
    if (isPosition(c)) {
      const [x, y] = c
      if (x < w) w = x
      if (x > e) e = x
      if (y < s) s = y
      if (y > n) n = y
    } else {
      for (const child of c) visit(child)
    }
  }
  for (const feat of features) {
    if (feat.geometry?.coordinates) visit(feat.geometry.coordinates)
  }
  return w === Infinity ? [0, 0, 0, 0] : [w, s, e, n]
}

export const geojsonConverter: ConverterHandler = {
  id: 'geojson',
  priority: 50,

  match(group) {
    return group.primary.ext === '.geojson' || group.primary.ext === '.json'
  },

  async convert(group, ctx) {
    const bytes = await ctx.readFile(group.primary.path)
    let parsed: unknown
    try {
      parsed = JSON.parse(bytes.toString('utf-8'))
    } catch (err) {
      throw new Error(`geojson: invalid JSON — ${(err as Error).message}`)
    }

    const fc = parsed as FeatureCollection
    if (fc?.type !== 'FeatureCollection' || !Array.isArray(fc.features)) {
      throw new Error('geojson: expected a FeatureCollection at top level')
    }

    const srcCrs = extractSourceCrs(fc)
    if (srcCrs) {
      for (const feat of fc.features) {
        if (feat.geometry?.coordinates) {
          feat.geometry.coordinates = reprojectCoords(feat.geometry.coordinates, srcCrs)
        }
      }
      delete fc.crs
    }

    for (const feat of fc.features) {
      feat.properties = {
        ...(feat.properties ?? {}),
        source: ctx.provenance.source,
        license: ctx.provenance.license,
      }
    }

    const bbox = computeBbox(fc.features)
    return {
      bytes: Buffer.from(JSON.stringify(fc)),
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: fc.features.length,
      bbox,
    }
  },
}

register(geojsonConverter)
