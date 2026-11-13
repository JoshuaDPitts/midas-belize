import { register } from './_register'
import type { DatasetSchema } from './_types'

const MONTHS: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
}

const FILENAME_PATTERN = /^Rfactor_([A-Za-z]+)\.tiff?$/i

export function classifyByFilename(filename: string): { year: number | null; month: number } | null {
  const match = filename.match(FILENAME_PATTERN)
  if (!match) return null
  const month = MONTHS[match[1].toLowerCase()]
  if (!month) return null
  return { year: null, month }
}

export const rfactorMonthly: DatasetSchema = {
  id: 'rfactor-monthly',
  family: 'rfactor-monthly',
  schemaVersion: 1,
  classify: () => false,
  incoming: { required: [], optional: [], patterns: [] },
  map: (row) => row,
}

register(rfactorMonthly)
