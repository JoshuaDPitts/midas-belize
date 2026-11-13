import { bucket } from './firebase-admin'
import { ProvenanceFileSchema, type ProvenanceFile } from './provenance-schema'
import type { FileGroup } from './types'
import type { Provenance } from '@/lib/data/types'

export interface ProvenanceHints {
  join_to?: string
  join_key?: string
  csv_key?: string
  strict?: boolean
  scope?: 'site' | 'multi-site' | 'national'
  sites?: string[]
  tags?: string[]
  dataset_id?: string
  schema_family?: string
  title?: string
  description?: string
  notes?: string
  bbox?: [number, number, number, number]
  temporal_extent?: { start: string; end: string }
}

export type ProvenanceLoadResult =
  | { status: 'ok'; provenance: Provenance; hints: ProvenanceHints }
  | { status: 'awaiting-provenance' }
  | { status: 'provenance-incomplete'; errors: string[] }

export async function loadProvenanceForGroup(group: FileGroup): Promise<ProvenanceLoadResult> {
  if (!group.provenanceFile) {
    return { status: 'awaiting-provenance' }
  }

  let raw: unknown
  try {
    const [bytes] = await bucket.file(group.provenanceFile.path).download()
    raw = JSON.parse(bytes.toString('utf-8'))
  } catch (err) {
    return {
      status: 'provenance-incomplete',
      errors: [`parse error: ${(err as Error).message}`],
    }
  }

  const parsed = ProvenanceFileSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'provenance-incomplete',
      errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
    }
  }

  const file: ProvenanceFile = parsed.data
  return {
    status: 'ok',
    provenance: {
      source: file.source,
      source_url: file.source_url,
      license: file.license,
      citation: file.citation,
      upstream_paths: file.upstream_paths,
    },
    hints: {
      join_to: file.join_to ?? undefined,
      join_key: file.join_key,
      csv_key: file.csv_key,
      strict: file.strict ?? false,
      scope: file.scope,
      sites: file.sites,
      tags: file.tags,
      dataset_id: file.dataset_id,
      schema_family: file.schema_family,
      title: file.title,
      description: file.description,
      notes: file.notes,
      bbox: file.bbox,
      temporal_extent: file.temporal_extent,
    },
  }
}
