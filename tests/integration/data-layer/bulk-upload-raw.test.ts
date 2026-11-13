import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import { collectUploadPlan, upload } from '../../../scripts/pre-process/bulk-upload-raw'

process.env.FIREBASE_STORAGE_EMULATOR_HOST =
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199'

describe('bulk-upload-raw', () => {
  let refRoot: string
  let draftsRoot: string

  beforeAll(async () => {
    if (getApps().length === 0) {
      initializeApp({ projectId: 'midas-test', storageBucket: 'midas-data' })
    }

    refRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bulk-upload-ref-'))
    draftsRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'bulk-upload-drafts-'))

    // Source: a single shapefile with sidecars under reference/Placencia/
    await fs.mkdir(path.join(refRoot, 'Placencia'), { recursive: true })
    for (const ext of ['.shp', '.shx', '.dbf', '.prj']) {
      await fs.writeFile(path.join(refRoot, 'Placencia', `Placencia${ext}`), `contents${ext}`)
    }

    // A provenance draft referencing that shapefile
    await fs.mkdir(path.join(draftsRoot, 'placencia'), { recursive: true })
    await fs.writeFile(
      path.join(draftsRoot, 'placencia', 'placencia-site.provenance.json'),
      JSON.stringify({
        _target_path: 'raw/Placencia/Placencia.provenance.json',
        source: 's', source_url: null, license: 'l', citation: 'c',
        upstream_paths: ['reference/Placencia/Placencia.shp'],
        dataset_id: 'placencia-site',
      }),
    )

    // A draft with an external: sentinel (should be skipped)
    await fs.mkdir(path.join(draftsRoot, 'external'), { recursive: true })
    await fs.writeFile(
      path.join(draftsRoot, 'external', 'gfw.provenance.json'),
      JSON.stringify({
        _target_path: 'raw/gfw/gfw.provenance.json',
        source: 's', source_url: null, license: 'l', citation: 'c',
        upstream_paths: ['external:gfw-api/presence'],
        dataset_id: 'gfw-presence',
      }),
    )

    // A malformed draft (should be skipped with a warning)
    await fs.writeFile(path.join(draftsRoot, 'bad.provenance.json'), '{ malformed')
  })

  afterAll(async () => {
    await fs.rm(refRoot, { recursive: true, force: true })
    await fs.rm(draftsRoot, { recursive: true, force: true })
  })

  beforeEach(async () => {
    const [files] = await getStorage().bucket().getFiles()
    for (const f of files) await f.delete()
  })

  it('plans uploads from the source file + its sidecars + the provenance sidecar, skipping externals', async () => {
    const plan = await collectUploadPlan(refRoot, draftsRoot)
    expect(plan.sourceFiles.size).toBe(4)
    expect(plan.provenanceFiles.size).toBe(2)

    const destinations = [...plan.sourceFiles.values()].sort()
    expect(destinations).toEqual([
      'raw/Placencia/Placencia.dbf',
      'raw/Placencia/Placencia.prj',
      'raw/Placencia/Placencia.shp',
      'raw/Placencia/Placencia.shx',
    ])
  })

  it('dry-run reports uploads without writing to the bucket', async () => {
    const plan = await collectUploadPlan(refRoot, draftsRoot)
    const summary = await upload(plan, { dryRun: true, force: false })
    expect(summary.planned).toBe(6)
    expect(summary.uploaded).toBe(6)
    expect(summary.failed).toBe(0)

    const [files] = await getStorage().bucket().getFiles()
    expect(files.length).toBe(0)
  })

  it('uploads source + sidecars + provenance to the bucket, skips existing on second run', async () => {
    const plan = await collectUploadPlan(refRoot, draftsRoot)
    const first = await upload(plan, { dryRun: false, force: false })
    expect(first.uploaded).toBe(6)
    expect(first.skipped_existing).toBe(0)

    const [files] = await getStorage().bucket().getFiles()
    const names = files.map((f) => f.name).sort()
    expect(names).toContain('raw/Placencia/Placencia.shp')
    expect(names).toContain('raw/Placencia/Placencia.shx')
    expect(names).toContain('raw/Placencia/Placencia.provenance.json')
    expect(names).toContain('raw/gfw/gfw.provenance.json')

    const second = await upload(plan, { dryRun: false, force: false })
    expect(second.uploaded).toBe(0)
    expect(second.skipped_existing).toBe(6)
  })

  it('force mode re-uploads even when file already exists', async () => {
    const plan = await collectUploadPlan(refRoot, draftsRoot)
    await upload(plan, { dryRun: false, force: false })

    const second = await upload(plan, { dryRun: false, force: true })
    expect(second.uploaded).toBe(6)
    expect(second.skipped_existing).toBe(0)
  })

  it('runs main() when invoked via tsx (guards against the isDirectInvocation regression)', () => {
    // Regression test for the path-with-spaces silent-CLI bug: the isDirectInvocation
    // check must use pathToFileURL() to correctly URL-encode paths. If it falls back
    // to string concatenation (`file://${process.argv[1]}`), main() silently never
    // fires on macOS paths containing spaces or special characters.
    //
    // The script may legitimately exit non-zero (e.g. missing upstream file per
    // DEC-025 D-01) — we only care that main() produced the expected output.
    const repoRoot = path.resolve(__dirname, '../../..')
    let stdout = ''
    try {
      stdout = execFileSync(
        'pnpm',
        ['tsx', 'scripts/pre-process/bulk-upload-raw.ts', '--dry-run'],
        {
          cwd: repoRoot,
          env: {
            ...process.env,
            USE_EMULATORS: '1',
            FIREBASE_STORAGE_EMULATOR_HOST:
              process.env.FIREBASE_STORAGE_EMULATOR_HOST ?? 'localhost:9199',
          },
          encoding: 'utf-8',
        },
      )
    } catch (err) {
      const error = err as { stdout?: string }
      stdout = error.stdout ?? ''
    }
    expect(stdout).toContain('Mode:           DRY-RUN')
    expect(stdout).toMatch(/Planned: \d+ source \+ \d+ provenance = \d+ files/)
  })

  it('counts a missing local file as a failure without crashing the batch', async () => {
    // Add a draft that references an upstream path that doesn't actually exist.
    await fs.writeFile(
      path.join(draftsRoot, 'missing.provenance.json'),
      JSON.stringify({
        _target_path: 'raw/missing.provenance.json',
        source: 's', source_url: null, license: 'l', citation: 'c',
        upstream_paths: ['reference/Ghost/Absent.shp'],
        dataset_id: 'ghost',
      }),
    )
    const plan = await collectUploadPlan(refRoot, draftsRoot)
    const summary = await upload(plan, { dryRun: false, force: false })
    expect(summary.failed).toBeGreaterThanOrEqual(1)
    // Local placencia files still uploaded fine.
    expect(summary.uploaded).toBeGreaterThanOrEqual(6)
    // Cleanup.
    await fs.rm(path.join(draftsRoot, 'missing.provenance.json'))
  })
})
