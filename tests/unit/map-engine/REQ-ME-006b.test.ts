import { describe, it, expect } from 'vitest';
import { ContourLayer } from '@deck.gl/aggregation-layers';
import { buildDeckLayer } from '@/lib/map/layers/deckLayers';
import type {
  DeckContourLayer,
  DeckGridLayer,
  DeckHeatmapLayer,
  DeckHexagonLayer,
  DeckScreenGridLayer,
} from '@/lib/map/layers/types';

const pts = {
  kind: 'array' as const,
  data: [
    { p: [-88.3, 16.5], w: 12 },
    { p: [-88.2, 16.6], w: 25 },
    { p: [-88.1, 16.55], w: 8 },
  ],
};

describe('REQ-ME-006b: buildDeckLayer — aggregation batch', () => {
  it('builds a HeatmapLayer', () => {
    const cfg: DeckHeatmapLayer = {
      id: 'h',
      type: 'deck.heatmap',
      source: pts,
      getPosition: 'p',
      style: { getWeight: 'w', radiusPixels: 40 },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('HeatmapLayer');
    expect(layer.id).toBe('h');
  });

  it('builds a HexagonLayer with extrusion defaults', () => {
    const cfg: DeckHexagonLayer = {
      id: 'x',
      type: 'deck.hexagon',
      source: pts,
      getPosition: 'p',
      style: { getWeight: 'w', radius: 5000, extruded: true },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('HexagonLayer');
  });

  it('builds a GridLayer', () => {
    const cfg: DeckGridLayer = {
      id: 'g',
      type: 'deck.grid',
      source: pts,
      getPosition: 'p',
      style: { getWeight: 'w', cellSize: 3000 },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('GridLayer');
  });

  it('builds a ContourLayer with thresholds', () => {
    const cfg: DeckContourLayer = {
      id: 'c',
      type: 'deck.contour',
      source: pts,
      getPosition: 'p',
      style: {
        cellSize: 2000,
        contours: [
          { threshold: 1, color: [20, 184, 166], strokeWidth: 2 },
          { threshold: 5, color: [245, 158, 11], strokeWidth: 2 },
        ],
      },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer).toBeInstanceOf(ContourLayer);
  });

  it('builds a ScreenGridLayer', () => {
    const cfg: DeckScreenGridLayer = {
      id: 's',
      type: 'deck.screengrid',
      source: pts,
      getPosition: 'p',
      style: { getWeight: 'w', cellSizePixels: 24 },
    };
    const layer = buildDeckLayer(cfg);
    expect(layer.constructor.name).toBe('ScreenGridLayer');
  });
});
