import type { NbsRankFactor, WatershedPolygonContext } from './_types';

/** In-memory factor registry, keyed by `factor.id`. Re-registration
 * replaces the previous entry under the same id (tests use this to swap
 * fixtures; runtime app code never re-registers). */
const registry = new Map<string, NbsRankFactor<WatershedPolygonContext>>();

export function registerFactor(factor: NbsRankFactor<WatershedPolygonContext>): void {
  registry.set(factor.id, factor);
}

/** Snapshot of all currently-registered factors. Insertion-order preserved
 * so the customise-sliders UI presents them in registration order. */
export function getRegisteredFactors(): NbsRankFactor<WatershedPolygonContext>[] {
  return Array.from(registry.values());
}

/** Test-only: empty the registry. Production code does not call this. */
export function clearFactors(): void {
  registry.clear();
}
