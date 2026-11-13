import { z } from 'zod'
import type { Provenance } from './types'

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

export function validateProvenance(
  input: unknown,
): { ok: true; value: Provenance } | { ok: false; errors: string[] } {
  const parsed = ProvenanceSchema.safeParse(input)
  if (parsed.success) return { ok: true, value: parsed.data }
  return {
    ok: false,
    errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
  }
}
