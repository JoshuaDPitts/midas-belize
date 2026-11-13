import type { Provenance, SiteId } from '@/lib/data/types'

export interface DetectedFile {
  path: string
  relativePath: string
  ext: string
  size_bytes: number
  mtime: Date
}

export interface FileGroup {
  primary: DetectedFile
  sidecars: DetectedFile[]
  provenanceFile: DetectedFile | null
}

export interface ConverterContext {
  datasetId: string
  provenance: Provenance
  readFile: (path: string) => Promise<Buffer>
}

export interface ConvertedAsset {
  bytes: Buffer
  contentType: string
  extension: string
  feature_count?: number
  bbox?: [number, number, number, number]
  temporal_extent?: { start: string; end: string }
}

export interface ConverterHandler {
  id: string
  priority: number
  match: (group: FileGroup) => boolean
  convert: (group: FileGroup, ctx: ConverterContext) => Promise<ConvertedAsset>
}

export interface ShapefileUpstream {
  kind: 'shapefile'
  basePath: string
  primaryFile: string
  sidecarFiles: string[]
}

export interface CsvUpstream {
  kind: 'csv'
  basePath: string
  primaryFile: string
  joinTo?: string
  joinKey?: string
}

export interface GeoTiffUpstream {
  kind: 'geotiff'
  basePath: string
  primaryFile: string
}

export interface GeoJsonUpstream {
  kind: 'geojson'
  basePath: string
  primaryFile: string
}

export type UpstreamSpec = ShapefileUpstream | CsvUpstream | GeoTiffUpstream | GeoJsonUpstream

export interface DatasetDefinition {
  id: string
  title: string
  description: string
  family: string
  schemaId: string
  schemaVersion: number
  scope: 'site' | 'multi-site' | 'national'
  sites: SiteId[]
  tags: string[]
  upstream: UpstreamSpec
  provenance: Provenance
}
