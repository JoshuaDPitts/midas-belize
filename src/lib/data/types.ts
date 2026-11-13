import type { Timestamp } from 'firebase-admin/firestore'

export type SiteId = 'placencia' | 'caye-caulker' | 'laughing-bird'

export type DatasetScope = 'site' | 'multi-site' | 'national'

export type DatasetStatus =
  | 'published'
  | 'provenance-incomplete'
  | 'schema-drift-blocked'
  | 'awaiting-provenance'
  | 'orphaned'
  | 'processing'

export type PipelineRunStatus = 'running' | 'success' | 'partial' | 'failed'

export type DatasetOutcomeStatus =
  | 'published'
  | 'skipped-nochange'
  | 'blocked-drift'
  | 'blocked-provenance'
  | 'failed'

export type Bbox = [west: number, south: number, east: number, north: number]

export interface Provenance {
  source: string
  source_url: string | null
  license: string
  citation: string
  upstream_paths: string[]
}

export interface TemporalExtent {
  start: string
  end: string
}

export interface DatasetVersion {
  version: string
  gcs_path: string
  content_hash: string
  content_type: string
  size_bytes: number
  feature_count?: number
  bbox: Bbox
  temporal_extent?: TemporalExtent
  published_at: Timestamp
  pipeline_run_id: string
  source_file_paths: Array<{ path: string; hash: string }>
  schema_version: number
  is_current: boolean
}

export interface CurrentVersionSummary {
  version: string
  gcs_path: string
  content_type: string
  size_bytes: number
  feature_count?: number
  bbox: Bbox
  temporal_extent?: TemporalExtent
  published_at: Timestamp
  pipeline_run_id: string
}

export interface CatalogEntry {
  id: string
  layer: string
  title: string
  description: string
  family: string
  schema_id: string
  schema_version: number
  scope: DatasetScope
  sites: SiteId[]
  visible_at: SiteId[]
  tags: string[]
  current_version: CurrentVersionSummary | null
  provenance: Provenance
  status: DatasetStatus
  last_upstream_mtime: Timestamp
  last_processed_at: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}

export interface DatasetOutcome {
  dataset_id: string
  version_before?: string
  version_after?: string
  status: DatasetOutcomeStatus
  reason?: string
  duration_ms: number
}

export interface PipelineRun {
  triggered_by: 'drive-change' | 'manual-dispatch' | 'schedule' | 'dataset-rerun'
  triggered_by_ip_hash?: string
  started_at: Timestamp
  ended_at?: Timestamp
  duration_ms?: number
  github_run_url: string
  status: PipelineRunStatus
  summary: {
    datasets_total: number
    datasets_published: number
    datasets_skipped_nochange: number
    datasets_blocked_by_drift: number
    datasets_failed: number
    discovered_files_new: number
    schema_drift_opened: number
  }
  dataset_outcomes: DatasetOutcome[]
  drift_opened: string[]
  discovered_new: string[]
  error_summary?: string
}

export interface SchemaDriftDiff {
  missing_required: string[]
  added_unknown: string[]
  renamed_candidates: Array<{ from: string; to: string; confidence: number }>
  dropped_dynamic: string[]
}

export interface SchemaDrift {
  schema_id: string
  current_schema_version: number
  detected_at: Timestamp
  first_seen_in_run: string
  last_seen_in_run: string
  occurrence_count: number
  diff: SchemaDriftDiff
  affected_datasets: string[]
  sample_rows: Record<string, unknown>[]
  source_file_path: string
  status: 'open' | 'accepted' | 'rejected' | 'deferred' | 'superseded'
  resolved_at?: Timestamp
  resolved_by?: string
  resolution_commit_sha?: string
  resolution_notes?: string
}

export interface DiscoveredFile {
  path: string
  ext: string
  mime: string
  size_bytes: number
  first_seen: Timestamp
  last_seen: Timestamp
  seen_in_runs: string[]
  sample_bytes_base64?: string
  status: 'unrecognized' | 'ignored' | 'pending_converter'
  ignored_reason?: string
  suggested_converter?: string
}

export interface DatasetSchema<Raw = Record<string, unknown>, Canonical = Record<string, unknown>> {
  id: string
  family: string
  schemaVersion: number
  classify: (headerRow: string[]) => boolean
  incoming: {
    required: string[]
    optional: string[]
    patterns: RegExp[]
  }
  canonical: unknown
  map: (row: Raw) => Canonical
  validators?: Record<string, (value: unknown) => boolean>
}
