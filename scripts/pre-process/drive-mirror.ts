import type { Bucket } from '@google-cloud/storage'
import type { ChangedPath, DriveClient } from './drive-poller'

/**
 * Extended DriveClient for mirroring — adds files.get() for both media
 * (file bytes) and metadata (name+parents for path resolution).
 *
 * Structured as an extension of DriveClient because the poller +
 * mirror share the same underlying googleapis drive_v3.Drive at
 * deploy time.
 */
export interface DriveMirrorClient extends DriveClient {
  files: {
    get: (
      params: {
        fileId: string
        fields?: string
        alt?: 'media' | 'json'
        supportsAllDrives?: boolean
      },
      options?: { responseType?: 'arraybuffer' | 'json' },
    ) => Promise<{
      data:
        | ArrayBuffer
        | Buffer
        | { name?: string | null; parents?: string[] | null }
    }>
  }
}

export interface MirrorOpts {
  changes: ChangedPath[]
  bucket: Pick<Bucket, 'file'>
  drive: DriveMirrorClient
  resolvePath: (fileId: string) => Promise<string>
}

export interface MirrorResult {
  uploaded: number
  deleted: number
  skipped: number
}

/**
 * Filename-suffix allowlist for files we actually want to mirror into
 * `gs://midas-data/raw/`. Anything outside this list (photos, PDFs,
 * Word docs, generic binaries) is skipped — those formats never reach
 * the preprocess pipeline, so mirroring them just wastes bandwidth +
 * storage + memory. Compound suffixes (`.shp.xml`, `.aux.xml`,
 * `.provenance.json` — covered by `.json`) work because `endsWith()`
 * tests longest-match naturally.
 *
 * Approved 2026-05-11 with the user. To add a format: extend this list,
 * add a test case under tests/unit/data-layer/drive-mirror-allowlist.test.ts,
 * and redeploy via Cloud Run update (avoid `gcloud functions deploy`'s
 * 50 MiB source re-upload).
 */
const ALLOWED_SUFFIXES = [
  // Tabular
  '.csv',
  // Shapefile + sidecars
  '.shp',
  '.dbf',
  '.shx',
  '.prj',
  '.cpg',
  '.shp.xml',
  '.aux.xml',
  // Raster
  '.tif',
  '.tiff',
  // Vector text (.json covers .provenance.json)
  '.geojson',
  '.json',
  // Simile (Simulistics) model files
  '.sml',
  '.smx',
  '.smi',
  '.sma',
  // JMP statistical files
  '.jmp',
] as const

export function isAllowedFilename(name: string): boolean {
  const lower = name.toLowerCase()
  return ALLOWED_SUFFIXES.some((suffix) => lower.endsWith(suffix))
}

export async function mirrorChangesToGcs(opts: MirrorOpts): Promise<MirrorResult> {
  const result: MirrorResult = { uploaded: 0, deleted: 0, skipped: 0 }
  for (const change of opts.changes) {
    // Skip Google-Docs virtual files — they aren't real bytes on Drive.
    if (change.mimeType?.startsWith('application/vnd.google-apps.')) {
      result.skipped++
      continue
    }
    // Skip files outside the allowlist — but always honour `removed`
    // so we can clean up GCS copies of formats we used to mirror.
    if (!change.removed && !isAllowedFilename(change.name)) {
      result.skipped++
      continue
    }
    const rel = await opts.resolvePath(change.fileId)
    const gcsPath = `raw/${rel}`
    if (change.removed) {
      try {
        await opts.bucket.file(gcsPath).delete()
      } catch {
        // GCS object may not exist — idempotent delete.
      }
      result.deleted++
      continue
    }
    const res = await opts.drive.files.get(
      { fileId: change.fileId, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' },
    )
    const data = res.data
    const buffer =
      data instanceof Buffer
        ? data
        : data instanceof ArrayBuffer
          ? Buffer.from(data)
          : Buffer.from(JSON.stringify(data))
    await opts.bucket.file(gcsPath).save(buffer)
    result.uploaded++
  }
  return result
}

/**
 * Drive's changes API doesn't return full paths — you walk the
 * parents chain yourself. This resolver caches aggressively to avoid
 * an N+1 blowup when many changes share a common ancestor.
 */
export function makePathResolver(drive: DriveMirrorClient, rootFolderId: string) {
  const cache = new Map<string, string>()
  cache.set(rootFolderId, '')

  async function pathOf(fileId: string): Promise<string> {
    const cached = cache.get(fileId)
    if (cached !== undefined) return cached
    const res = await drive.files.get({
      fileId,
      fields: 'name,parents',
      supportsAllDrives: true,
    })
    const data = res.data as { name?: string | null; parents?: string[] | null }
    const name = data.name ?? fileId
    const parentId = data.parents?.[0] ?? null
    const parentPath = parentId ? await pathOf(parentId) : ''
    const path = parentPath ? `${parentPath}/${name}` : name
    cache.set(fileId, path)
    return path
  }

  return { pathOf }
}
