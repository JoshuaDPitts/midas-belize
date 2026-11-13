export interface IncomingSpec {
  required: string[]
  optional: string[]
  patterns: RegExp[]
}

export interface DatasetSchema {
  id: string
  family: string
  schemaVersion: number
  classify: (headerRow: string[]) => boolean
  incoming: IncomingSpec
  map: (row: Record<string, unknown>) => Record<string, unknown>
  validators?: Record<string, (value: unknown) => boolean>
}
