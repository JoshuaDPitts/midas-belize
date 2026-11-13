import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider, createStore } from 'jotai';
import type { FeatureCollection } from 'geojson';
import { erosionHotspotEnabledAtom } from '@/atoms';
import {
  buildErosionHotspotLayer,
  polygonsToHotspotPoints,
  EROSION_HOTSPOT_LAYER_ID,
} from '@/features/watershed/map/ErosionHotspotHeatmap';
import { ErosionHotspotToggle } from '@/features/watershed/map/ErosionHotspotToggle';

const ringNear = (lng: number, lat: number) => [
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
      properties: { Name: 'High', A_t_ha_yr: 3.0 },
      geometry: { type: 'Polygon', coordinates: [ringNear(-88.4, 16.5)] },
    },
    {
      type: 'Feature',
      properties: { Name: 'Low', A_t_ha_yr: 0.3 },
      geometry: { type: 'Polygon', coordinates: [ringNear(-88.3, 16.5)] },
    },
    {
      type: 'Feature',
      properties: { Name: 'NoData' /* A_t_ha_yr missing */ },
      geometry: { type: 'Polygon', coordinates: [ringNear(-88.2, 16.5)] },
    },
  ],
};

describe('REQ-WS-030: ErosionHotspotHeatmap', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
  });

  describe('polygonsToHotspotPoints', () => {
    it('returns one point per polygon with centroid + weight from A_t_ha_yr', () => {
      const pts = polygonsToHotspotPoints(FIXTURE);
      expect(pts).toHaveLength(3);
      // High has weight 3, Low has weight 0.3, NoData has weight 0.
      const weights = pts.map((p) => p.weight).sort((a, b) => a - b);
      expect(weights).toEqual([0, 0.3, 3]);
    });

    it('clamps negative or non-finite A values to 0', () => {
      const fc: FeatureCollection = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { A_t_ha_yr: -5 },
            geometry: { type: 'Polygon', coordinates: [ringNear(-88, 16)] },
          },
          {
            type: 'Feature',
            properties: { A_t_ha_yr: Infinity },
            geometry: { type: 'Polygon', coordinates: [ringNear(-88, 16)] },
          },
        ],
      };
      expect(polygonsToHotspotPoints(fc).every((p) => p.weight === 0)).toBe(true);
    });

    it('returns empty array for null geometry', () => {
      expect(polygonsToHotspotPoints(null)).toEqual([]);
    });
  });

  describe('buildErosionHotspotLayer', () => {
    it('returns null when enabled=false', () => {
      expect(buildErosionHotspotLayer({ enabled: false, geometry: FIXTURE })).toBeNull();
    });

    it('returns null when geometry is null', () => {
      expect(buildErosionHotspotLayer({ enabled: true, geometry: null })).toBeNull();
    });

    it('returns a HexagonLayer when enabled with non-empty geometry', () => {
      const layer = buildErosionHotspotLayer({ enabled: true, geometry: FIXTURE });
      expect(layer).not.toBeNull();
      expect(layer!.id).toBe(EROSION_HOTSPOT_LAYER_ID);
    });
  });

  describe('ErosionHotspotToggle pill', () => {
    function renderToggle() {
      const store = createStore();
      return {
        store,
        ...render(
          <Provider store={store}>
            <ErosionHotspotToggle />
          </Provider>,
        ),
      };
    }

    it('starts with aria-checked=false (atom default)', () => {
      renderToggle();
      const btn = screen.getByTestId('erosion-hotspot-toggle');
      expect(btn.getAttribute('aria-checked')).toBe('false');
    });

    it('clicking toggles erosionHotspotEnabledAtom on and off', async () => {
      const user = userEvent.setup();
      const { store } = renderToggle();
      await user.click(screen.getByTestId('erosion-hotspot-toggle'));
      expect(store.get(erosionHotspotEnabledAtom)).toBe(true);
      await user.click(screen.getByTestId('erosion-hotspot-toggle'));
      expect(store.get(erosionHotspotEnabledAtom)).toBe(false);
    });
  });
});
