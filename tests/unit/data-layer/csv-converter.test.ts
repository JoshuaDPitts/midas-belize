import { describe, it, expect, beforeEach } from 'vitest'
import { csvConverter } from '@/../scripts/pre-process/converters/csv'
import {
  clearRegistry,
  register,
  findHandler,
} from '@/../scripts/pre-process/registry'
import type { FileGroup } from '@/../scripts/pre-process/types'

function mk(rel: string, ext = '.csv'): FileGroup {
  return {
    primary: {
      path: `raw/${rel}`,
      relativePath: rel,
      ext,
      size_bytes: 1,
      mtime: new Date(0),
    },
    sidecars: [],
    provenanceFile: null,
  }
}

describe('csvConverter', () => {
  beforeEach(() => {
    clearRegistry()
    register(csvConverter)
  })

  it('matches bare .csv file', () => {
    expect(findHandler(mk('data.csv'))?.id).toBe('csv')
  })

  it('does not match .tsv', () => {
    expect(findHandler(mk('data.tsv', '.tsv'))).toBeNull()
  })

  it('converts simple CSV to typed JSON with provenance fields on every row', async () => {
    const csv = 'name,value\nA,1\nB,2\n'
    const readFile = async () => Buffer.from(csv)
    const asset = await csvConverter.convert(mk('data.csv'), {
      datasetId: 'test',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['data.csv'],
      },
      readFile,
    })
    expect(asset.contentType).toBe('application/json')
    expect(asset.extension).toBe('.json')
    const parsed = JSON.parse(asset.bytes.toString('utf-8'))
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]).toMatchObject({ name: 'A', value: '1', source: 's', license: 'l' })
  })

  it('handles quoted fields with commas + CRLF + BOM', async () => {
    const csvWithBom = '﻿name,value\r\n"Hello, world","x"\r\n'
    const readFile = async () => Buffer.from(csvWithBom, 'utf-8')
    const asset = await csvConverter.convert(mk('x.csv'), {
      datasetId: 't',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      readFile,
    })
    const parsed = JSON.parse(asset.bytes.toString('utf-8'))
    expect(parsed.rows).toHaveLength(1)
    expect(parsed.rows[0].name).toBe('Hello, world')
  })

  it('tolerates wide-format rows (more columns than the header)', async () => {
    // MangrovesBC.csv pattern: 1-column header, body rows with 2000+ fields.
    // Without relax_column_count, csv-parse throws and the whole publish fails.
    const csv = 'MangrovesBC\nrow1-extra1,extra2,extra3,extra4\nrow2-only\n'
    const readFile = async () => Buffer.from(csv)
    const asset = await csvConverter.convert(mk('mangroves.csv'), {
      datasetId: 't',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      readFile,
    })
    const parsed = JSON.parse(asset.bytes.toString('utf-8'))
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0].MangrovesBC).toBe('row1-extra1')
    expect(parsed.rows[1].MangrovesBC).toBe('row2-only')
  })

  it('processes 1000 rows under 200ms', async () => {
    const lines = ['a,b']
    for (let i = 0; i < 1000; i++) lines.push(`${i},${i * 2}`)
    const readFile = async () => Buffer.from(lines.join('\n'))
    const t0 = performance.now()
    await csvConverter.convert(mk('big.csv'), {
      datasetId: 't',
      provenance: {
        source: 's',
        source_url: null,
        license: 'l',
        citation: 'c',
        upstream_paths: ['x'],
      },
      readFile,
    })
    expect(performance.now() - t0).toBeLessThan(200)
  })
})
