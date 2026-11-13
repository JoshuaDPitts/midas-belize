import crypto from 'node:crypto'

export function sha256OfBytes(chunks: Buffer[]): string {
  const h = crypto.createHash('sha256')
  for (const c of chunks) h.update(c)
  return h.digest('hex')
}

export function buildVersion(contentHash: string, now: Date = new Date()): string {
  const date = now.toISOString().slice(0, 10)
  return `v${date}-${contentHash.slice(0, 7)}`
}
