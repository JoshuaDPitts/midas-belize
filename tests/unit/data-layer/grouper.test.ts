import { describe, it, expect } from 'vitest'
import { groupFiles } from '@/../scripts/pre-process/grouper'
import type { DetectedFile } from '@/../scripts/pre-process/types'

function mk(rel: string, size = 1): DetectedFile {
  const ext = rel.includes('.') ? '.' + rel.split('.').pop()!.toLowerCase() : ''
  return {
    path: `raw/${rel}`,
    relativePath: rel,
    ext,
    size_bytes: size,
    mtime: new Date(0),
  }
}

describe('groupFiles', () => {
  it('groups .shp with its sidecars by basename', () => {
    const files = [
      mk('placencia/Placencia.shp'),
      mk('placencia/Placencia.shx'),
      mk('placencia/Placencia.dbf'),
      mk('placencia/Placencia.prj'),
      mk('placencia/Placencia.cpg'),
    ]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.ext).toBe('.shp')
    expect(groups[0].sidecars.map((s) => s.ext).sort()).toEqual([
      '.cpg',
      '.dbf',
      '.prj',
      '.shx',
    ])
    expect(groups[0].provenanceFile).toBeNull()
  })

  it('attaches a .provenance.json to its same-basename peer', () => {
    const files = [mk('x/coral.csv'), mk('x/coral.provenance.json')]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.relativePath).toBe('x/coral.csv')
    expect(groups[0].provenanceFile?.relativePath).toBe('x/coral.provenance.json')
  })

  it('orphan files become single-file groups with no sidecars', () => {
    const files = [mk('a/standalone.tif')]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.ext).toBe('.tif')
    expect(groups[0].sidecars).toEqual([])
  })

  it('does not group unrelated files that share a directory', () => {
    const files = [mk('shared/a.csv'), mk('shared/b.csv'), mk('shared/c.tif')]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(3)
  })

  it('ignores spurious same-basename files across different directories', () => {
    const files = [
      mk('dir1/Placencia.shp'),
      mk('dir1/Placencia.shx'),
      mk('dir1/Placencia.dbf'),
      mk('dir2/Placencia.prj'),
    ]
    const groups = groupFiles(files)
    const placenciaGroup = groups.find((g) => g.primary.path === 'raw/dir1/Placencia.shp')!
    expect(placenciaGroup.sidecars.map((s) => s.relativePath).sort()).toEqual([
      'dir1/Placencia.dbf',
      'dir1/Placencia.shx',
    ])
    expect(groups.find((g) => g.primary.path === 'raw/dir2/Placencia.prj')).toBeDefined()
  })

  it('routes .provenance.json to provenanceFile even if the peer is .shp (not .csv)', () => {
    const files = [
      mk('x/foo.shp'),
      mk('x/foo.shx'),
      mk('x/foo.dbf'),
      mk('x/foo.provenance.json'),
    ]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].provenanceFile?.relativePath).toBe('x/foo.provenance.json')
  })

  it('folds ESRI metadata (.shp.xml) into the .shp group as a sidecar — not as an orphan', () => {
    // Regression for D-17: in production we observed 3 "blocked_provenance"
    // mystery groups at seed time which turned out to be Foo.shp.xml files
    // landing in their own buckets (basenameKey strips just the trailing
    // `.xml`, leaving `Foo.shp` as the bucket key — never matching `Foo.shp`'s
    // own `Foo` bucket). They should fold as sidecars of their .shp peer.
    const files = [
      mk('hex/Hexagons6KM_ExportFeatures.shp'),
      mk('hex/Hexagons6KM_ExportFeatures.shx'),
      mk('hex/Hexagons6KM_ExportFeatures.dbf'),
      mk('hex/Hexagons6KM_ExportFeatures.shp.xml'),
    ]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.relativePath).toBe('hex/Hexagons6KM_ExportFeatures.shp')
    expect(groups[0].sidecars.map((s) => s.relativePath).sort()).toEqual([
      'hex/Hexagons6KM_ExportFeatures.dbf',
      'hex/Hexagons6KM_ExportFeatures.shp.xml',
      'hex/Hexagons6KM_ExportFeatures.shx',
    ])
  })

  it('folds ArcGIS auxiliary metadata (.shp.aux.xml) into the .shp group as a sidecar', () => {
    const files = [
      mk('a/Foo.shp'),
      mk('a/Foo.shx'),
      mk('a/Foo.shp.aux.xml'),
    ]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.relativePath).toBe('a/Foo.shp')
    expect(groups[0].sidecars.map((s) => s.relativePath).sort()).toEqual([
      'a/Foo.shp.aux.xml',
      'a/Foo.shx',
    ])
  })

  it('routes a stray .shp.xml without a .shp peer to its own group (preserves existing orphan behavior)', () => {
    const files = [mk('orphan/Lonely.shp.xml')]
    const groups = groupFiles(files)
    expect(groups).toHaveLength(1)
    expect(groups[0].primary.relativePath).toBe('orphan/Lonely.shp.xml')
    expect(groups[0].sidecars).toEqual([])
  })
})
