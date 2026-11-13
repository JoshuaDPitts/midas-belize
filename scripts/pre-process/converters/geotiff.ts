import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { register } from '../registry'
import type { ConverterHandler } from '../types'

async function runCogeo(inputPath: string, outputPath: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const proc = spawn('rio', [
      'cogeo', 'create',
      inputPath, outputPath,
      '--co', 'COMPRESS=LZW',
      '--co', 'BLOCKXSIZE=512',
      '--co', 'BLOCKYSIZE=512',
      '--overview-resampling', 'average',
    ])
    let stderr = ''
    proc.stderr.on('data', (d) => { stderr += d.toString() })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`rio cogeo exited ${code}: ${stderr}`))
    })
  })
}

export const geotiffConverter: ConverterHandler = {
  id: 'geotiff',
  priority: 100,

  match(group) {
    return ['.tif', '.tiff'].includes(group.primary.ext)
  },

  async convert(group, ctx) {
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cogeo-'))
    const inputPath = path.join(tmpDir, 'in.tif')
    const outputPath = path.join(tmpDir, 'out.tif')

    try {
      const inBytes = await ctx.readFile(group.primary.path)
      await fs.writeFile(inputPath, inBytes)

      await runCogeo(inputPath, outputPath)

      const outBytes = await fs.readFile(outputPath)
      return {
        bytes: outBytes,
        contentType: 'image/tiff; application=geotiff; profile=cloud-optimized',
        extension: '.tif',
      }
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {})
    }
  },
}

register(geotiffConverter)
