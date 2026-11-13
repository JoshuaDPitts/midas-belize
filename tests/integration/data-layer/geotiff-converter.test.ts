import { describe, it, expect, beforeEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { geotiffConverter } from '../../../scripts/pre-process/converters/geotiff'
import { clearRegistry, register, findHandler } from '../../../scripts/pre-process/registry'
import type { FileGroup } from '../../../scripts/pre-process/types'

const execFileP = promisify(execFile)
const FIXTURE = path.join(__dirname, '../../fixtures/data-layer/tiny-raster.tif')

function mk(rel: string, ext: string): FileGroup {
  return {
    primary: { path: `raw/${rel}`, relativePath: rel, ext, size_bytes: 1, mtime: new Date(0) },
    sidecars: [],
    provenanceFile: null,
  }
}

const PROV = {
  source: 's',
  source_url: null,
  license: 'l',
  citation: 'c',
  upstream_paths: ['x'],
}

describe('geotiffConverter', () => {
  beforeEach(() => {
    clearRegistry()
    register(geotiffConverter)
  })

  it('matches .tif and .tiff, rejects other extensions', () => {
    expect(findHandler(mk('x.tif', '.tif'))?.id).toBe('geotiff')
    expect(findHandler(mk('x.tiff', '.tiff'))?.id).toBe('geotiff')
    expect(findHandler(mk('x.jpg', '.jpg'))).toBeNull()
    expect(findHandler(mk('x.csv', '.csv'))).toBeNull()
  })

  it('produces a valid COG from the fixture raster', async () => {
    const asset = await geotiffConverter.convert(mk('tiny-raster.tif', '.tif'), {
      datasetId: 'test',
      provenance: { ...PROV },
      readFile: async () => fs.readFile(FIXTURE),
    })

    expect(asset.contentType).toBe('image/tiff; application=geotiff; profile=cloud-optimized')
    expect(asset.extension).toBe('.tif')
    expect(asset.bytes.byteLength).toBeGreaterThan(0)

    const tmp = path.join(os.tmpdir(), `out-${Date.now()}-${Math.random().toString(36).slice(2)}.tif`)
    await fs.writeFile(tmp, asset.bytes)
    try {
      const { stdout } = await execFileP('rio', ['cogeo', 'validate', tmp])
      expect(stdout.toLowerCase()).toContain('is a valid cloud optimized')
    } finally {
      await fs.unlink(tmp).catch(() => {})
    }
  }, 60_000)

  it('memory footprint stays under 100MB during conversion', async () => {
    const before = process.memoryUsage().heapUsed
    await geotiffConverter.convert(mk('tiny-raster.tif', '.tif'), {
      datasetId: 't',
      provenance: { ...PROV },
      readFile: async () => fs.readFile(FIXTURE),
    })
    const after = process.memoryUsage().heapUsed
    expect(after - before).toBeLessThan(100 * 1024 * 1024)
  }, 60_000)
})
