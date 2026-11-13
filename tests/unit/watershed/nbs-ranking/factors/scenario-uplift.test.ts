import { describe, it, expect } from 'vitest';
import { scenarioUpliftFactor } from '@/features/watershed/domain/nbs-ranking/factors/scenario-uplift';
import type { WatershedPolygonContext } from '@/features/watershed/domain/nbs-ranking/_types';
import type { Feature, Polygon } from 'geojson';

function ctx(props: Record<string, unknown>): WatershedPolygonContext {
  const feature: Feature<Polygon> = {
    type: 'Feature',
    properties: props,
    geometry: { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]] },
  };
  return { feature, properties: props };
}

describe('REQ-WS-023: scenario-uplift factor (stubbed)', () => {
  it('exposes correct metadata', () => {
    expect(scenarioUpliftFactor.id).toBe('scenario-uplift');
    expect(scenarioUpliftFactor.defaultWeight).toBe(0.5);
    expect(scenarioUpliftFactor.direction).toBe('higher-better');
  });

  it('always returns null until WS-033 useScenarioImpact lands', () => {
    expect(scenarioUpliftFactor.compute(ctx({ Name: 'A' }))).toBeNull();
    expect(scenarioUpliftFactor.compute(ctx({ scenario_delta_nbs: 0.42 }))).toBeNull();
  });
});
