import { describe, it, expect } from 'vitest';
import type { FeatureCollection } from 'geojson';
import {
  buildScenarioDeltaLayer,
  SCENARIO_DELTA_LAYER_ID,
} from '@/features/watershed/map/ScenarioDeltaLayer';

const ring = (lng: number, lat: number) => [
  [lng, lat],
  [lng + 0.05, lat],
  [lng + 0.05, lat + 0.05],
  [lng, lat + 0.05],
  [lng, lat],
];

const FIXTURE: FeatureCollection = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { Name: 'Big Creek' },
      geometry: { type: 'Polygon', coordinates: [ring(-88.4, 16.5)] },
    },
    {
      type: 'Feature',
      properties: { Name: 'Sennis' },
      geometry: { type: 'Polygon', coordinates: [ring(-88.3, 16.5)] },
    },
  ],
};

describe('REQ-WS-038: buildScenarioDeltaLayer', () => {
  it('returns null when scenarioId is null', () => {
    expect(
      buildScenarioDeltaLayer({
        scenarioId: null,
        geometry: FIXTURE,
        watershedDeltas: new Map([['Big Creek', -10]]),
      }),
    ).toBeNull();
  });

  it('returns null when geometry is missing', () => {
    expect(
      buildScenarioDeltaLayer({
        scenarioId: 'restoration',
        geometry: null,
        watershedDeltas: new Map([['Big Creek', -10]]),
      }),
    ).toBeNull();
  });

  it('returns null when deltas map is empty', () => {
    expect(
      buildScenarioDeltaLayer({
        scenarioId: 'restoration',
        geometry: FIXTURE,
        watershedDeltas: new Map(),
      }),
    ).toBeNull();
  });

  it('returns a GeoJsonLayer with the correct id when active + populated', () => {
    const layer = buildScenarioDeltaLayer({
      scenarioId: 'restoration',
      geometry: FIXTURE,
      watershedDeltas: new Map([
        ['Big Creek', -10],
        ['Sennis', 5],
      ]),
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe(SCENARIO_DELTA_LAYER_ID);
  });

  it('getFillColor returns greenish RGBA for negative Δ and coral for positive', () => {
    const layer = buildScenarioDeltaLayer({
      scenarioId: 'restoration',
      geometry: FIXTURE,
      watershedDeltas: new Map([
        ['Big Creek', -10],
        ['Sennis', 10],
      ]),
    })!;
    const accessor = layer.props.getFillColor as (
      f: (typeof FIXTURE)['features'][number],
    ) => [number, number, number, number];
    const bcColor = accessor(FIXTURE.features[0]); // Big Creek, Δ -10 → green
    const senColor = accessor(FIXTURE.features[1]); // Sennis, Δ +10 → coral
    // Green ramp: G channel higher than coral's.
    expect(bcColor[1]).toBeGreaterThan(senColor[1]);
    // Coral ramp: R channel higher than green's.
    expect(senColor[0]).toBeGreaterThan(bcColor[0]);
  });
});
