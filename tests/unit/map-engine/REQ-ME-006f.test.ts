/**
 * REQ-ME-006f — H3 sub-batch (T17).
 *
 * Validates buildDeckLayer('deck.h3-hexagon') against @deck.gl/geo-layers
 * H3HexagonLayer, plus sanity-checks the h3-js dependency used by the
 * client-side aggregation in H3Overlay.
 */

import { describe, it, expect } from 'vitest';
import { H3HexagonLayer } from '@deck.gl/geo-layers';
import { latLngToCell } from 'h3-js';
import { buildDeckLayer } from '@/lib/map/layers/deckLayers';
import type { DeckH3HexagonLayer } from '@/lib/map/layers/types';

const baseCfg: DeckH3HexagonLayer = {
  id: 'h3-under-test',
  type: 'deck.h3-hexagon',
  source: {
    kind: 'array',
    data: [
      { hex: '862834387ffffff', hours: 10 },
      { hex: '86283473fffffff', hours: 25 },
    ],
  },
  getHexagon: 'hex',
  style: {
    getValue: 'hours',
    domain: [0, 25],
    extruded: true,
    elevationScale: 30,
  },
};

describe('REQ-ME-006f: buildDeckLayer — deck.h3-hexagon', () => {
  it('builds an H3HexagonLayer with the configured id', () => {
    const layer = buildDeckLayer(baseCfg);
    expect(layer).toBeInstanceOf(H3HexagonLayer);
    expect(layer.id).toBe('h3-under-test');
  });

  it('resolves the getHexagon accessor against plain-object data', () => {
    const layer = buildDeckLayer(baseCfg);
    const props = layer.props as { getHexagon?: (d: unknown) => string };
    expect(typeof props.getHexagon).toBe('function');
    expect(props.getHexagon!({ hex: 'abc', hours: 1 })).toBe('abc');
  });

  it('respects extrusion + elevation config', () => {
    const layer = buildDeckLayer(baseCfg);
    const props = layer.props as { extruded?: boolean; elevationScale?: number };
    expect(props.extruded).toBe(true);
    expect(props.elevationScale).toBe(30);
  });
});

describe('REQ-ME-006f: h3-js aggregation correctness', () => {
  it('maps Belize EEZ coordinates to valid H3 cells at resolution 6', () => {
    // Sample: Placencia area + Belize City area + offshore
    const samples: [number, number][] = [
      [16.52, -88.37],
      [17.5, -88.19],
      [17.2, -87.6],
    ];
    const cells = samples.map(([lat, lng]) => latLngToCell(lat, lng, 6));
    for (const c of cells) {
      expect(typeof c).toBe('string');
      // H3 cell indexes are 15-char lowercase hex strings
      expect(c).toMatch(/^[0-9a-f]{15}$/);
    }
    // Different locations should produce different cells at res 6
    expect(new Set(cells).size).toBe(3);
  });

  it('increases cell count as resolution increases', () => {
    // Same 100 points spread across 1° × 1° box → more cells at finer res
    const pts: [number, number][] = [];
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 10; j++) {
        pts.push([16 + i / 10, -89 + j / 10]);
      }
    }
    const cellsRes4 = new Set(pts.map(([lat, lng]) => latLngToCell(lat, lng, 4)));
    const cellsRes7 = new Set(pts.map(([lat, lng]) => latLngToCell(lat, lng, 7)));
    expect(cellsRes7.size).toBeGreaterThan(cellsRes4.size);
  });
});
