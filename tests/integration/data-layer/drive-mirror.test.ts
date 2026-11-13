import { describe, it, expect, vi } from 'vitest'
import {
  mirrorChangesToGcs,
  makePathResolver,
  type DriveMirrorClient,
} from '../../../scripts/pre-process/drive-mirror'
import type { ChangedPath } from '../../../scripts/pre-process/drive-poller'

interface MockFile {
  path: string
  savedBytes?: Buffer
  wasDeleted?: boolean
}

function mockBucket() {
  const files = new Map<string, MockFile>()
  return {
    files,
    bucket: {
      file: vi.fn((path: string) => {
        let entry = files.get(path)
        if (!entry) {
          entry = { path }
          files.set(path, entry)
        }
        return {
          save: vi.fn(async (bytes: Buffer) => {
            entry!.savedBytes = bytes
          }),
          delete: vi.fn(async () => {
            entry!.wasDeleted = true
          }),
        }
      }),
    },
  }
}

describe('mirrorChangesToGcs', () => {
  it('downloads each changed file and writes to raw/<resolved-path>', async () => {
    const { files, bucket } = mockBucket()
    const drive: DriveMirrorClient = {
      changes: {
        getStartPageToken: vi.fn(),
        list: vi.fn(),
      },
      files: {
        get: vi.fn(async ({ fileId, alt }) => {
          if (alt === 'media') {
            return { data: Buffer.from(`content-of-${fileId}`) }
          }
          return { data: { name: `file-${fileId}`, parents: ['root'] } }
        }),
      },
    }
    const resolvePath = vi.fn(async (fileId: string) => `sub/${fileId}.txt`)

    const changes: ChangedPath[] = [
      { fileId: 'f1', name: 'a.txt', mimeType: 'text/plain', removed: false },
      { fileId: 'f2', name: 'b.txt', mimeType: 'text/plain', removed: true },
    ]

    const r = await mirrorChangesToGcs({
      changes,
      bucket: bucket as never,
      drive,
      resolvePath,
    })

    expect(r.uploaded).toBe(1)
    expect(r.deleted).toBe(1)
    expect(r.skipped).toBe(0)
    expect(files.get('raw/sub/f1.txt')?.savedBytes?.toString()).toBe('content-of-f1')
    expect(files.get('raw/sub/f2.txt')?.wasDeleted).toBe(true)
  })

  it('skips Google Docs virtual files (mimeType application/vnd.google-apps.*)', async () => {
    const { bucket } = mockBucket()
    const drive: DriveMirrorClient = {
      changes: { getStartPageToken: vi.fn(), list: vi.fn() },
      files: {
        get: vi.fn(async () => ({ data: Buffer.from('') })),
      },
    }
    const changes: ChangedPath[] = [
      {
        fileId: 'doc1',
        name: 'report',
        mimeType: 'application/vnd.google-apps.document',
        removed: false,
      },
    ]
    const r = await mirrorChangesToGcs({
      changes,
      bucket: bucket as never,
      drive,
      resolvePath: vi.fn(),
    })
    expect(r.uploaded).toBe(0)
    expect(r.deleted).toBe(0)
    expect(r.skipped).toBe(1)
    expect(drive.files.get).not.toHaveBeenCalled()
  })

  it('swallows delete errors (object may not exist — idempotent)', async () => {
    const bucket = {
      file: vi.fn(() => ({
        save: vi.fn(),
        delete: vi.fn(async () => {
          throw new Error('No such object')
        }),
      })),
    }
    const drive: DriveMirrorClient = {
      changes: { getStartPageToken: vi.fn(), list: vi.fn() },
      files: { get: vi.fn() },
    }
    const changes: ChangedPath[] = [
      { fileId: 'f1', name: 'x', mimeType: 'text/plain', removed: true },
    ]
    const r = await mirrorChangesToGcs({
      changes,
      bucket: bucket as never,
      drive,
      resolvePath: async () => 'x.txt',
    })
    expect(r.deleted).toBe(1)
  })

  it('handles ArrayBuffer response from drive.files.get', async () => {
    const { files, bucket } = mockBucket()
    const testBytes = new Uint8Array([1, 2, 3, 4, 5]).buffer
    const drive: DriveMirrorClient = {
      changes: { getStartPageToken: vi.fn(), list: vi.fn() },
      files: {
        get: vi.fn(async () => ({ data: testBytes })),
      },
    }
    const changes: ChangedPath[] = [
      { fileId: 'f1', name: 'x.bin', mimeType: 'application/octet-stream', removed: false },
    ]
    await mirrorChangesToGcs({
      changes,
      bucket: bucket as never,
      drive,
      resolvePath: async () => 'x.bin',
    })
    const saved = files.get('raw/x.bin')?.savedBytes
    expect(saved?.length).toBe(5)
    expect(Array.from(saved!)).toEqual([1, 2, 3, 4, 5])
  })
})

describe('makePathResolver', () => {
  it('walks the parent chain + caches by fileId', async () => {
    const getCalls: Array<{ fileId: string }> = []
    const drive: DriveMirrorClient = {
      changes: { getStartPageToken: vi.fn(), list: vi.fn() },
      files: {
        get: vi.fn(async ({ fileId }) => {
          getCalls.push({ fileId })
          const tree: Record<string, { name: string; parent: string | null }> = {
            a: { name: 'a.csv', parent: 'sub' },
            sub: { name: 'sub', parent: 'root-folder' },
            b: { name: 'b.csv', parent: 'sub' },
          }
          const node = tree[fileId]
          return { data: { name: node.name, parents: node.parent ? [node.parent] : [] } }
        }),
      },
    }
    const resolver = makePathResolver(drive, 'root-folder')

    expect(await resolver.pathOf('a')).toBe('sub/a.csv')
    expect(await resolver.pathOf('b')).toBe('sub/b.csv')
    // `sub` should only be looked up once due to caching.
    const subLookups = getCalls.filter((c) => c.fileId === 'sub').length
    expect(subLookups).toBe(1)
  })

  it('root folder maps to empty path (files directly under root are named just their filename)', async () => {
    const drive: DriveMirrorClient = {
      changes: { getStartPageToken: vi.fn(), list: vi.fn() },
      files: {
        get: vi.fn(async () => ({
          data: { name: 'top-level.csv', parents: ['root'] },
        })),
      },
    }
    const resolver = makePathResolver(drive, 'root')
    expect(await resolver.pathOf('top-file')).toBe('top-level.csv')
  })
})
