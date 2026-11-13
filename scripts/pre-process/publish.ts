import { Timestamp } from 'firebase-admin/firestore'
import { db, bucket } from './firebase-admin'
import { sha256OfBytes, buildVersion } from './hash'
import { ACTIVE_SITES } from './sites'
import type { ConvertedAsset } from './types'
import type { Provenance, SiteId } from '@/lib/data/types'

export interface DatasetDefinitionInput {
  id: string
  title: string
  description: string
  family: string
  schemaId: string
  schemaVersion: number
  scope: 'site' | 'multi-site' | 'national'
  sites: readonly SiteId[]
  tags: readonly string[]
  provenance: Provenance
}

export interface PublishInput {
  definition: DatasetDefinitionInput
  asset: ConvertedAsset
  inputs: Array<{ path: string; bytes: Buffer }>
  pipelineRunId: string
}

export interface PublishResult {
  version: string
  gcsPath: string
  skipped: boolean
}

function computeVisibleAt(def: DatasetDefinitionInput): SiteId[] {
  if (def.scope === 'national') return [...ACTIVE_SITES]
  return [...def.sites]
}

export async function publishAsset(input: PublishInput): Promise<PublishResult> {
  const { definition, asset, inputs, pipelineRunId } = input

  const sorted = [...inputs].sort((a, b) => a.path.localeCompare(b.path))
  // Include the converter's output bytes in the content hash so a converter
  // change (e.g., csv-polygon-join gaining numeric coercion) invalidates the
  // cached version even when the source CSV / provenance bytes are unchanged.
  // Without this, a converter bugfix landed but no dataset republished because
  // the input hash matched the prior version's hash. Discovered 2026-05-13
  // after the seed following 44f8b18 republished 0 ebin-clade-detail datasets.
  const contentHash = sha256OfBytes([...sorted.map((i) => i.bytes), asset.bytes])
  const version = buildVersion(contentHash)
  const gcsPath = `${definition.id}/${version}${asset.extension}`

  const datasetRef = db.collection('datasets').doc(definition.id)
  const existing = await datasetRef.get()
  const existingData = existing.data()
  if (existing.exists && existingData?.current_version?.version === version) {
    return { version, gcsPath, skipped: true }
  }

  const file = bucket.file(gcsPath)
  await file.save(asset.bytes, {
    contentType: asset.contentType,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000, immutable',
    },
  })

  const now = Timestamp.now()
  const visibleAt = computeVisibleAt(definition)

  const versionData = {
    version,
    gcs_path: gcsPath,
    content_hash: contentHash,
    content_type: asset.contentType,
    size_bytes: asset.bytes.byteLength,
    ...(asset.feature_count !== undefined ? { feature_count: asset.feature_count } : {}),
    bbox: asset.bbox ?? [0, 0, 0, 0],
    temporal_extent: asset.temporal_extent ?? null,
    published_at: now,
    pipeline_run_id: pipelineRunId,
    source_file_paths: sorted.map((i) => ({
      path: i.path,
      hash: sha256OfBytes([i.bytes]),
    })),
    schema_version: definition.schemaVersion,
    is_current: true,
  }

  if (existing.exists && existingData?.current_version?.version) {
    const prevVersion: string = existingData.current_version.version
    await datasetRef
      .collection('versions')
      .doc(prevVersion)
      .set({ is_current: false }, { merge: true })
  }

  await datasetRef.collection('versions').doc(version).set(versionData)

  const parentData = {
    id: definition.id,
    layer: definition.id,
    title: definition.title,
    description: definition.description,
    family: definition.family,
    schema_id: definition.schemaId,
    schema_version: definition.schemaVersion,
    scope: definition.scope,
    sites: [...definition.sites],
    visible_at: visibleAt,
    tags: [...definition.tags],
    current_version: {
      version,
      gcs_path: gcsPath,
      content_type: asset.contentType,
      size_bytes: asset.bytes.byteLength,
      ...(asset.feature_count !== undefined ? { feature_count: asset.feature_count } : {}),
      bbox: asset.bbox ?? [0, 0, 0, 0],
      temporal_extent: asset.temporal_extent ?? null,
      published_at: now,
      pipeline_run_id: pipelineRunId,
    },
    provenance: definition.provenance,
    status: 'published' as const,
    last_upstream_mtime: now,
    last_processed_at: now,
    created_at: existing.exists ? existingData?.created_at : now,
    updated_at: now,
  }
  await datasetRef.set(parentData, { merge: true })

  return { version, gcsPath, skipped: false }
}
