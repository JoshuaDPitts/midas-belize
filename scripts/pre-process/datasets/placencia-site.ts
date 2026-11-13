import type { DatasetDefinition } from '../types'

export const placenciaSite: DatasetDefinition = {
  id: 'placencia-site',
  title: 'Placencia site boundary',
  description: 'Site-extent polygon for Placencia used for scoping marine/coastal analyses.',
  family: 'site-boundary',
  schemaId: 'site-boundary',
  schemaVersion: 1,
  scope: 'site',
  sites: ['placencia'],
  tags: ['site-boundary', 'placencia'],
  upstream: {
    kind: 'shapefile',
    basePath: 'MIMES_MIDAS/GIS Base Maps/Marine/Placencia/',
    primaryFile: 'Placencia.shp',
    sidecarFiles: ['Placencia.shx', 'Placencia.dbf', 'Placencia.prj', 'Placencia.cpg'],
  },
  provenance: {
    source: 'MIDAS/MIMES Belize 2026 project',
    source_url: null,
    license:
      'Shared by project collaborators for internal use; not for public redistribution without provenance check.',
    citation: 'MIDAS/MIMES Belize 2026 — Placencia site boundary (ArcGIS export).',
    upstream_paths: ['reference/MIMES_MIDAS/GIS Base Maps/Marine/Placencia/Placencia.shp'],
  },
}
