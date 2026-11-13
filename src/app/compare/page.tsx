import { Metadata } from 'next';
import { Suspense } from 'react';
import { ScenarioCompareRoute } from '@/features/scenarios/compare/ScenarioCompareRoute';

export const metadata: Metadata = {
  title: 'Compare Scenarios | Midas Belize',
  description: 'Compare coastal and watershed management scenarios side-by-side with interactive maps and delta visualizations.',
};

/**
 * /compare route
 * 
 * Renders the scenario comparison UI with:
 * - Dual scenario selection (A vs B)
 * - Vertical selection (coastal/watershed/marine)
 * - Mode toggle (diff overlay / swipe curtain)
 * - Delta cards and interactive map comparison
 * 
 * URL params:
 * - ?b={scenarioId} — Scenario B (Scenario A defaults to basecase)
 * - ?v={coastal|watershed|marine} — Vertical (defaults to coastal)
 * - ?mode={diff|swipe} — Comparison mode (defaults to diff)
 */
export default function ComparePage() {
  // ScenarioCompareRoute uses nuqs (useCompareUrlSyncProvider), which transitively
  // calls useSearchParams — that requires a Suspense boundary for static prerender
  // (next build / firebase deploy). Mirrors the pattern in src/app/page.tsx.
  return (
    <Suspense fallback={null}>
      <ScenarioCompareRoute />
    </Suspense>
  );
}
