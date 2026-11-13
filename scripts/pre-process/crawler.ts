import path from 'node:path'
import { bucket } from './firebase-admin'
import type { DetectedFile } from './types'

export async function crawlBucket(prefix: string): Promise<DetectedFile[]> {
  if (!prefix.endsWith('/')) prefix = `${prefix}/`
  const [files] = await bucket.getFiles({ prefix })

  const out: DetectedFile[] = []
  for (const f of files) {
    const [metadata] = await f.getMetadata()
    const p = f.name
    const rel = p.slice(prefix.length)
    if (!rel) continue
    out.push({
      path: p,
      relativePath: rel,
      ext: path.extname(p).toLowerCase(),
      size_bytes: Number(metadata.size ?? 0),
      mtime: metadata.updated ? new Date(metadata.updated) : new Date(0),
    })
  }
  return out
}
