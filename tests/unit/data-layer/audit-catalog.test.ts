import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { auditCatalog } from '@/../scripts/pre-process/audit-catalog'

let tmpRepo: string
let referenceRoot: string

async function writeFile(rel: string, content = 'x'): Promise<void> {
  const full = path.join(referenceRoot, rel)
  await fs.mkdir(path.dirname(full), { recursive: true })
  await fs.writeFile(full, content)
}

function mockProdDatasets(datasets: { id: string; upstream_paths: string[] }[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (typeof url === 'string' && url.endsWith('/api/ops/datasets')) {
        return new Response(
          JSON.stringify({
            datasets: datasets.map((d) => ({
              id: d.id,
              provenance: { upstream_paths: d.upstream_paths },
            })),
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        )
      }
      return new Response('not mocked', { status: 500 })
    }),
  )
}

beforeEach(async () => {
  tmpRepo = await fs.mkdtemp(path.join(os.tmpdir(), 'audit-catalog-'))
  referenceRoot = path.join(tmpRepo, 'reference')
  await fs.mkdir(referenceRoot, { recursive: true })
})

afterEach(async () => {
  vi.unstubAllGlobals()
  await fs.rm(tmpRepo, { recursive: true, force: true })
})

describe('auditCatalog', () => {
  it('reports an empty audit when nothing exists on either side', async () => {
    mockProdDatasets([])
    const r = await auditCatalog({
      referenceRoot,
      prodUrl: 'https://example',
      emitJson: false,
      verbose: false,
    })
    expect(r.reference_files).toBe(0)
    expect(r.prod_datasets).toBe(0)
    expect(r.orphan_local).toEqual([])
    expect(r.missing_upstreams).toEqual([])
  })

  it('classifies overlap, orphan-local, and missing-upstreams correctly', async () => {
    await writeFile('NSFCOPES_BU/Rfactor_September.tif')
    await writeFile('MIMES_MIDAS/wip-not-published.csv')
    mockProdDatasets([
      {
        id: 'rfactor-sep',
        upstream_paths: ['reference/NSFCOPES_BU/Rfactor_September.tif'],
      },
      {
        id: 'orphan-ds',
        upstream_paths: ['reference/MIMES_MIDAS/missing-from-local.csv'],
      },
    ])
    const r = await auditCatalog({
      referenceRoot,
      prodUrl: 'https://example',
      emitJson: false,
      verbose: false,
    })
    expect(r.reference_files).toBe(2)
    expect(r.prod_datasets).toBe(2)
    expect(r.prod_upstream_paths).toBe(2)
    expect(r.local_referenced_overlap).toBe(1)
    expect(r.orphan_local).toEqual(['reference/MIMES_MIDAS/wip-not-published.csv'])
    expect(r.missing_upstreams).toEqual([
      {
        path: 'reference/MIMES_MIDAS/missing-from-local.csv',
        referenced_by: ['orphan-ds'],
      },
    ])
  })

  it('only collects data-extension files (skips xml, jpg, docx, pdf)', async () => {
    await writeFile('a/b.csv')
    await writeFile('a/b.xml')
    await writeFile('a/b.shp.xml')
    await writeFile('a/photo.jpg')
    await writeFile('a/notes.pdf')
    await writeFile('a/c.shp')
    await writeFile('a/d.tiff')
    mockProdDatasets([])
    const r = await auditCatalog({
      referenceRoot,
      prodUrl: 'https://example',
      emitJson: false,
      verbose: false,
    })
    expect(r.reference_files).toBe(3)
    expect(new Set(r.orphan_local)).toEqual(
      new Set([
        'reference/a/b.csv',
        'reference/a/c.shp',
        'reference/a/d.tiff',
      ]),
    )
  })

  it('aggregates multiple datasets referencing the same upstream path', async () => {
    await writeFile('shared.shp')
    mockProdDatasets([
      { id: 'ds-1', upstream_paths: ['reference/shared.shp'] },
      { id: 'ds-2', upstream_paths: ['reference/shared.shp'] },
    ])
    const r = await auditCatalog({
      referenceRoot,
      prodUrl: 'https://example',
      emitJson: false,
      verbose: false,
    })
    expect(r.prod_upstream_paths).toBe(1)
    expect(r.local_referenced_overlap).toBe(1)
    expect(r.missing_upstreams).toEqual([])
  })

  it('lists every referencing dataset when an upstream is missing locally', async () => {
    mockProdDatasets([
      { id: 'ds-a', upstream_paths: ['reference/gone.csv'] },
      { id: 'ds-b', upstream_paths: ['reference/gone.csv'] },
    ])
    const r = await auditCatalog({
      referenceRoot,
      prodUrl: 'https://example',
      emitJson: false,
      verbose: false,
    })
    expect(r.missing_upstreams).toEqual([
      {
        path: 'reference/gone.csv',
        referenced_by: ['ds-a', 'ds-b'],
      },
    ])
  })

  it('throws a helpful error when prod returns a non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('boom', { status: 500 })),
    )
    await expect(
      auditCatalog({
        referenceRoot,
        prodUrl: 'https://example',
        emitJson: false,
        verbose: false,
      }),
    ).rejects.toThrow(/HTTP 500/)
  })

  it('throws when prod payload is missing the datasets field', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ unexpected: true }), {
            status: 200,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    )
    await expect(
      auditCatalog({
        referenceRoot,
        prodUrl: 'https://example',
        emitJson: false,
        verbose: false,
      }),
    ).rejects.toThrow(/datasets/)
  })
})
