import { declareSchema } from './_template'

/**
 * Permissive fallback for Coastal Model CSVs whose headers we haven't
 * yet locked into a dedicated schema. Always returns false from classify
 * so it never auto-matches — provenance must explicitly request this id.
 */
export const mimesCoastalGeneric = declareSchema({
  id: 'mimes-coastal-generic',
  family: 'mimes-coastal',
  classify: () => false,
})
