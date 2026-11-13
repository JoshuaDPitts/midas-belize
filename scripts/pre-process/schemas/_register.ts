import type { DatasetSchema } from './_types'

const REGISTERED: DatasetSchema[] = []

export function register(schema: DatasetSchema): void {
  const existing = REGISTERED.findIndex((s) => s.id === schema.id)
  if (existing >= 0) REGISTERED.splice(existing, 1)
  REGISTERED.push(schema)
}

export function getSchemas(): DatasetSchema[] {
  return [...REGISTERED]
}

export function findSchemaById(id: string): DatasetSchema | undefined {
  return REGISTERED.find((s) => s.id === id)
}

export function classifyByHeader(headerRow: string[]): DatasetSchema | null {
  for (const s of REGISTERED) {
    if (s.classify(headerRow)) return s
  }
  return null
}

export function clearSchemas(): void {
  REGISTERED.length = 0
}
