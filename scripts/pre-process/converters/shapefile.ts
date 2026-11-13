import shpjs from 'shpjs'
import type { ConverterHandler } from '../types'
import { register } from '../registry'

type RingCoord = [number, number] | [number, number, number]
type Coords = RingCoord | RingCoord[] | RingCoord[][] | RingCoord[][][]

export const shapefileConverter: ConverterHandler = {
  id: 'shapefile',
  priority: 100,

  match(group) {
    if (group.primary.ext !== '.shp') return false
    const has = (e: string) => group.sidecars.some((s) => s.ext === e)
    return has('.shx') && has('.dbf')
  },

  async convert(group, ctx) {
    const shpBytes = await ctx.readFile(group.primary.path)
    const dbfSidecar = group.sidecars.find((s) => s.ext === '.dbf')
    const prjSidecar = group.sidecars.find((s) => s.ext === '.prj')
    if (!dbfSidecar) {
      throw new Error('shapefile: .dbf sidecar missing after match (invariant violation)')
    }
    const dbfBytes = await ctx.readFile(dbfSidecar.path)
    const prjText = prjSidecar
      ? (await ctx.readFile(prjSidecar.path)).toString('utf-8')
      : undefined

    let fc: GeoJSON.FeatureCollection
    try {
      // @types/shpjs lags upstream — getShapefile accepts { shp, dbf, prj } at runtime.
      const shp = shpjs as unknown as (
        input: { shp: Buffer; dbf: Buffer; prj?: string },
      ) => Promise<GeoJSON.FeatureCollection>
      fc = await shp({ shp: shpBytes, dbf: dbfBytes, prj: prjText })
    } catch (err) {
      throw new Error(`shapefile: parse failed — ${(err as Error).message}`)
    }

    if (
      !fc ||
      fc.type !== 'FeatureCollection' ||
      !Array.isArray(fc.features) ||
      fc.features.length === 0
    ) {
      throw new Error('shapefile: produced no features (empty or invalid input)')
    }

    for (const feat of fc.features) {
      feat.properties = {
        ...(feat.properties ?? {}),
        source: ctx.provenance.source,
        license: ctx.provenance.license,
      }
    }

    const bytes = Buffer.from(JSON.stringify(fc))
    const bbox = computeBbox(fc)

    return {
      bytes,
      contentType: 'application/geo+json',
      extension: '.geojson',
      feature_count: fc.features.length,
      bbox,
    }
  },
}

function computeBbox(fc: GeoJSON.FeatureCollection): [number, number, number, number] {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity

  const visit = (coords: Coords) => {
    if (typeof coords[0] === 'number') {
      const [x, y] = coords as [number, number]
      if (x < w) w = x
      if (x > e) e = x
      if (y < s) s = y
      if (y > n) n = y
    } else {
      for (const c of coords as Coords[]) visit(c)
    }
  }

  for (const feat of fc.features) {
    const geom = feat.geometry
    if (geom && 'coordinates' in geom && geom.coordinates) {
      visit(geom.coordinates as Coords)
    }
  }

  return [w, s, e, n]
}

register(shapefileConverter)
