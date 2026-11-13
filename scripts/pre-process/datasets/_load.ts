import { placenciaSite } from './placencia-site'
import type { DatasetDefinition } from '../types'

export const ALL_DATASETS: DatasetDefinition[] = [placenciaSite]

export function findDataset(id: string): DatasetDefinition | undefined {
  return ALL_DATASETS.find((d) => d.id === id)
}
