/**
 * Local Zod schema for .provenance.json validation during the preprocess pipeline.
 *
 * This mirrors `src/lib/data/provenance.ts` intentionally. Duplication is
 * preferred over importing across the scripts/ → src/ boundary because tsx's
 * CJS/ESM interop (Node 25 + no `"type": "module"`) drops named exports when
 * src/ modules are imported transitively through the scripts/ chain —
 * `ProvenanceFileSchema` lands as `undefined` at runtime.
 *
 * If this schema ever drifts from the web-app version, the drift is
 * itself a legitimate contract violation — both must accept + reject the
 * same .provenance.json files. Keep them in sync via the unit test below
 * (tests/unit/data-layer/provenance-schema-parity.test.ts).
 */
import { z } from 'zod'

export const ProvenanceSchema = z.object({
  source: z.string().min(1, 'source is required'),
  source_url: z.string().url().nullable(),
  license: z.string().min(1, 'license is required'),
  citation: z.string().min(1, 'citation is required'),
  upstream_paths: z.array(z.string()).min(1, 'at least one upstream_path required'),
})

export const ProvenanceFileSchema = ProvenanceSchema.extend({
  bbox: z.tuple([z.number(), z.number(), z.number(), z.number()]).optional(),
  temporal_extent: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
  scope: z.enum(['site', 'multi-site', 'national']).optional(),
  tags: z.array(z.string()).optional(),
  dataset_id: z.string().optional(),
  schema_family: z.string().optional(),
  join_to: z.string().nullable().optional(),
  /** Field name in the POLYGON SHAPE for the join. Default 'Polygon_ID'. */
  join_key: z.string().optional(),
  /** Field name in the CSV for the join (rare override). Default = join_key. */
  csv_key: z.string().optional(),
  strict: z.boolean().optional(),
  sites: z.array(z.string()).optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

export type ProvenanceFile = z.infer<typeof ProvenanceFileSchema>
