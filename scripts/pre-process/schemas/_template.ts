import { register } from './_register'
import type { DatasetSchema, IncomingSpec } from './_types'

export interface DeclareSchemaOptions {
  id: string
  family: string
  schemaVersion?: number
  classify?: DatasetSchema['classify']
  incoming?: Partial<IncomingSpec>
  map?: DatasetSchema['map']
  validators?: DatasetSchema['validators']
}

export function declareSchema(opts: DeclareSchemaOptions): DatasetSchema {
  const schema: DatasetSchema = {
    id: opts.id,
    family: opts.family,
    schemaVersion: opts.schemaVersion ?? 1,
    classify: opts.classify ?? (() => false),
    incoming: {
      required: opts.incoming?.required ?? [],
      optional: opts.incoming?.optional ?? [],
      patterns: opts.incoming?.patterns ?? [],
    },
    map: opts.map ?? ((row) => row),
    validators: opts.validators,
  }
  register(schema)
  return schema
}
