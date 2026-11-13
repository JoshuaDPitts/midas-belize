import path from 'node:path'
import type { DetectedFile, FileGroup } from './types'

const SHAPEFILE_SIDECAR_EXTS = new Set([
  '.shx',
  '.dbf',
  '.prj',
  '.cpg',
  '.qmd',
  '.sbn',
  '.sbx',
  '.xml',
])

// Compound extensions that ESRI / ArcGIS / QGIS write alongside a `.shp`
// (longest first so the trailing-match below picks the most specific one).
// `Foo.shp.aux.xml` and `Foo.shp.xml` need to bucket with `Foo.shp`, not with
// stray `Foo.shp` (which is what naive last-extension stripping produces) or
// `Foo.shp.aux` (likewise). Single `.aux.xml` covers raster siblings like
// `Foo.tif.aux.xml`. Without this, those metadata files become orphan groups
// at seed time and surface as `blocked_provenance` — D-17 root cause.
const COMPOUND_SHAPEFILE_SIDECAR_SUFFIXES = ['.shp.aux.xml', '.shp.xml', '.aux.xml']

function basenameKey(f: DetectedFile): string {
  const dir = path.posix.dirname(f.relativePath)
  let base = path.posix.basename(f.relativePath)
  if (base.endsWith('.provenance.json')) {
    base = base.slice(0, -'.provenance.json'.length)
  } else {
    const compound = COMPOUND_SHAPEFILE_SIDECAR_SUFFIXES.find((s) => base.endsWith(s))
    if (compound) {
      base = base.slice(0, -compound.length)
    } else {
      base = base.replace(/\.[^.]+$/, '')
    }
  }
  return dir === '.' ? base : `${dir}/${base}`
}

function isProvenance(f: DetectedFile): boolean {
  return f.relativePath.endsWith('.provenance.json')
}

function isShapefilePrimary(f: DetectedFile): boolean {
  return f.ext === '.shp'
}

function isShapefileSidecar(f: DetectedFile): boolean {
  return SHAPEFILE_SIDECAR_EXTS.has(f.ext)
}

export function groupFiles(files: DetectedFile[]): FileGroup[] {
  const buckets = new Map<string, DetectedFile[]>()
  for (const f of files) {
    const key = basenameKey(f)
    if (!buckets.has(key)) buckets.set(key, [])
    buckets.get(key)!.push(f)
  }

  const groups: FileGroup[] = []
  for (const members of buckets.values()) {
    const shp = members.find(isShapefilePrimary)
    const provenanceFile = members.find(isProvenance) ?? null
    const nonProvenance = members.filter((m) => !isProvenance(m))

    if (shp) {
      const sidecars = nonProvenance.filter((m) => m !== shp && isShapefileSidecar(m))
      groups.push({ primary: shp, sidecars, provenanceFile })
      for (const other of nonProvenance) {
        if (other === shp) continue
        if (isShapefileSidecar(other)) continue
        groups.push({ primary: other, sidecars: [], provenanceFile: null })
      }
    } else if (nonProvenance.length > 0) {
      for (const [i, m] of nonProvenance.entries()) {
        groups.push({
          primary: m,
          sidecars: [],
          provenanceFile: i === 0 ? provenanceFile : null,
        })
      }
    }
  }

  return groups
}
