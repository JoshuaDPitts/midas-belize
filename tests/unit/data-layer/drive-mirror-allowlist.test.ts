import { describe, it, expect, vi } from 'vitest';
import {
  isAllowedFilename,
  mirrorChangesToGcs,
  type MirrorOpts,
} from '@/../scripts/pre-process/drive-mirror';
import type { ChangedPath } from '@/../scripts/pre-process/drive-poller';

describe('isAllowedFilename — file-type allowlist for drive mirror', () => {
  it.each([
    // Tabular / vector data
    ['data.csv', true],
    ['Corals Species attributes.csv', true],
    ['boundary.shp', true],
    ['boundary.dbf', true],
    ['boundary.shx', true],
    ['boundary.prj', true],
    ['boundary.cpg', true],
    ['boundary.shp.xml', true],
    ['boundary.aux.xml', true],
    // Raster
    ['rfactor.tif', true],
    ['rfactor.tiff', true],
    // Vector text
    ['layer.geojson', true],
    ['catalog.json', true],
    ['Pl_Marine_ebin.provenance.json', true],
    // Simile (Simulistics)
    ['PL Marine 2.sml', true],
    ['PL Marine 2.smx', true],
    ['PL Marine 2.smi', true],
    ['PL Marine 2.sma', true],
    // JMP statistical
    ['analysis.jmp', true],
    // Case insensitive
    ['BOUNDARY.SHP', true],
    ['Corals.CSV', true],
  ])('allows %s', (name, expected) => {
    expect(isAllowedFilename(name)).toBe(expected);
  });

  it.each([
    // Photos — the actual OOM trigger discovered 2026-05-11
    ['DICC0120.JPG', false],
    ['photo.jpg', false],
    ['photo.jpeg', false],
    ['photo.png', false],
    ['photo.heic', false],
    // Docs
    ['Eqns.docx', false],
    ['notes.pdf', false],
    ['summary.doc', false],
    // Bare .xml without compound suffix (sidecar variants ARE allowed above)
    ['arbitrary.xml', false],
    // Compressed / packaged
    ['archive.zip', false],
    // Generic binary
    ['file.bin', false],
    // No extension
    ['README', false],
    // Empty
    ['', false],
  ])('skips %s', (name, expected) => {
    expect(isAllowedFilename(name)).toBe(expected);
  });
});

describe('mirrorChangesToGcs — allowlist integration', () => {
  function makeOpts(changes: ChangedPath[]): MirrorOpts & { savedPaths: string[] } {
    const savedPaths: string[] = [];
    const bucket = {
      file: (path: string) => ({
        save: vi.fn(async () => {
          savedPaths.push(path);
        }),
        delete: vi.fn(async () => {}),
      }),
    } as unknown as MirrorOpts['bucket'];
    const drive = {
      changes: { list: vi.fn() } as never,
      files: {
        get: vi.fn(async () => ({ data: Buffer.from('payload') })),
      },
    } as unknown as MirrorOpts['drive'];
    const resolvePath = vi.fn(async (id: string) => `path/${id}`);
    return { changes, bucket, drive, resolvePath, savedPaths };
  }

  it('uploads only allowlisted files, skips the rest', async () => {
    const opts = makeOpts([
      { fileId: 'a', name: 'data.csv', mimeType: 'text/csv', removed: false },
      { fileId: 'b', name: 'photo.jpg', mimeType: 'image/jpeg', removed: false },
      { fileId: 'c', name: 'PL Marine.sml', mimeType: 'application/octet-stream', removed: false },
      { fileId: 'd', name: 'doc.pdf', mimeType: 'application/pdf', removed: false },
    ]);

    const result = await mirrorChangesToGcs(opts);

    expect(result.uploaded).toBe(2);
    expect(result.skipped).toBe(2);
    expect(result.deleted).toBe(0);
    expect(opts.savedPaths.sort()).toEqual(['raw/path/a', 'raw/path/c'].sort());
    // Drive bytes only fetched for the 2 we uploaded — JPEG / PDF never touched.
    expect(opts.drive.files.get).toHaveBeenCalledTimes(2);
  });

  it('still skips Google-Docs virtual files regardless of name', async () => {
    const opts = makeOpts([
      {
        fileId: 'g',
        name: 'Some Doc.csv', // name lies — mimeType wins
        mimeType: 'application/vnd.google-apps.document',
        removed: false,
      },
    ]);
    const result = await mirrorChangesToGcs(opts);
    expect(result.skipped).toBe(1);
    expect(result.uploaded).toBe(0);
  });

  it('honours `removed` even for non-allowlisted extensions (cleans up legacy mirror)', async () => {
    // If we previously mirrored a JPEG before the allowlist landed, a later
    // deletion in Drive should still propagate to GCS.
    const opts = makeOpts([
      { fileId: 'legacy', name: 'old.jpg', mimeType: 'image/jpeg', removed: true },
    ]);
    const result = await mirrorChangesToGcs(opts);
    expect(result.deleted).toBe(1);
    expect(result.skipped).toBe(0);
  });
});
