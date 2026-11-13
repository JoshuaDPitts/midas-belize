import type { ConverterHandler, FileGroup } from './types'

const HANDLERS: ConverterHandler[] = []

export function register(handler: ConverterHandler): void {
  const existing = HANDLERS.findIndex((h) => h.id === handler.id)
  if (existing >= 0) HANDLERS.splice(existing, 1)
  HANDLERS.push(handler)
  HANDLERS.sort((a, b) => b.priority - a.priority)
}

export function getHandlers(): ConverterHandler[] {
  return [...HANDLERS]
}

export function findHandler(group: FileGroup): ConverterHandler | null {
  return HANDLERS.find((h) => h.match(group)) ?? null
}

export function clearRegistry(): void {
  HANDLERS.length = 0
}
