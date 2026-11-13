import { findHandler } from './registry'
import type { ConverterHandler, FileGroup } from './types'

export function classify(group: FileGroup): ConverterHandler | null {
  return findHandler(group)
}
