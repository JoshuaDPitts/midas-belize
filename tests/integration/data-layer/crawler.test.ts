import { describe, it, expect, beforeAll, beforeEach } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { crawlBucket } from '../../../scripts/pre-process/crawler'

process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('crawlBucket', () => {
  beforeAll(() => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }
  })

  beforeEach(async () => {
    const bucket = getStorage().bucket()
    const [files] = await bucket.getFiles({ prefix: 'raw/' })
    for (const f of files) await f.delete()
  })

  async function seed(path: string, content = 'x') {
    await getStorage().bucket().file(path).save(Buffer.from(content))
  }

  it('returns an empty list for an empty prefix', async () => {
    const files = await crawlBucket('raw/')
    expect(files).toEqual([])
  })

  it('lists every file under a prefix with correct metadata', async () => {
    await seed('raw/a.txt', 'hello')
    await seed('raw/sub/b.shp', '1234567890')
    const files = await crawlBucket('raw/')
    expect(files).toHaveLength(2)

    const a = files.find((f) => f.path === 'raw/a.txt')!
    expect(a.ext).toBe('.txt')
    expect(a.size_bytes).toBe(5)
    expect(a.relativePath).toBe('a.txt')
    expect(a.mtime).toBeInstanceOf(Date)

    const b = files.find((f) => f.path === 'raw/sub/b.shp')!
    expect(b.ext).toBe('.shp')
    expect(b.size_bytes).toBe(10)
    expect(b.relativePath).toBe('sub/b.shp')
  })

  it('normalizes extensions to lowercase and includes the leading dot', async () => {
    await seed('raw/A.SHP', 'x')
    await seed('raw/noext', 'x')
    const files = await crawlBucket('raw/')

    const shp = files.find((f) => f.path === 'raw/A.SHP')!
    expect(shp.ext).toBe('.shp')
    const noext = files.find((f) => f.path === 'raw/noext')!
    expect(noext.ext).toBe('')
  })

  it('supports a prefix filter', async () => {
    await seed('raw/placencia/a.shp')
    await seed('raw/placencia/a.dbf')
    await seed('raw/caye-caulker/b.shp')
    const placencia = await crawlBucket('raw/placencia/')
    expect(placencia.map((f) => f.path).sort()).toEqual([
      'raw/placencia/a.dbf',
      'raw/placencia/a.shp',
    ])
  })
})
