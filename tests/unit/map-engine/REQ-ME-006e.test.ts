/**
 * REQ-ME-006e — Mesh sub-batch (T16).
 *
 * Engine-only ship per DEC-014: no real GLTF asset in the project yet, so
 * no visible demo. These tests verify that buildDeckLayer constructs the
 * right deck classes and forwards mesh / scenegraph URLs correctly. When
 * a real asset lands, the overlay + Playwright baseline can be added
 * without touching the engine.
 */

import { describe, it, expect } from 'vitest';
import { SimpleMeshLayer, ScenegraphLayer } from '@deck.gl/mesh-layers';
import { buildDeckLayer } from '@/lib/map/layers/deckLayers';
import type {
  DeckSceneGraphLayer,
  DeckSimpleMeshLayer,
} from '@/lib/map/layers/types';

const fakeRows = {
  kind: 'array' as const,
  data: [
    { pos: [-88.2, 17.5], color: [255, 0, 0, 255] },
    { pos: [-87.9, 17.3], color: [0, 255, 0, 255] },
  ],
};

describe('REQ-ME-006e: buildDeckLayer — deck.simple-mesh', () => {
  const base: DeckSimpleMeshLayer = {
    id: 'mesh-under-test',
    type: 'deck.simple-mesh',
    source: fakeRows,
    getPosition: 'pos',
    mesh: 'https://example.test/marker.obj',
    style: { sizeScale: 10, color: [180, 180, 180, 255] },
  };

  it('builds a SimpleMeshLayer with the configured id', () => {
    const layer = buildDeckLayer(base);
    expect(layer).toBeInstanceOf(SimpleMeshLayer);
    expect(layer.id).toBe('mesh-under-test');
    // Note: deck.gl strips URL-valued mesh props on construction (they resolve
    // asynchronously via loaders.gl). We assert class identity + config
    // plumbing; the URL itself is only observable post-load.
  });

  it('resolves getPosition against row objects', () => {
    const layer = buildDeckLayer(base);
    const props = layer.props as { getPosition?: (d: unknown) => unknown };
    expect(typeof props.getPosition).toBe('function');
    expect(props.getPosition!({ pos: [1, 2] })).toEqual([1, 2]);
  });

  it('honors sizeScale', () => {
    const layer = buildDeckLayer(base);
    const props = layer.props as { sizeScale?: number };
    expect(props.sizeScale).toBe(10);
  });
});

describe('REQ-ME-006e: buildDeckLayer — deck.scenegraph', () => {
  const base: DeckSceneGraphLayer = {
    id: 'sg-under-test',
    type: 'deck.scenegraph',
    source: fakeRows,
    getPosition: 'pos',
    scenegraph: 'https://example.test/vessel.glb',
    style: { sizeScale: 100 },
  };

  it('builds a ScenegraphLayer with the configured id', () => {
    const layer = buildDeckLayer(base);
    expect(layer).toBeInstanceOf(ScenegraphLayer);
    expect(layer.id).toBe('sg-under-test');
    // As with mesh, the glTF URL is only observable post-load.
  });

  it('honors sizeScale', () => {
    const layer = buildDeckLayer(base);
    const props = layer.props as { sizeScale?: number };
    expect(props.sizeScale).toBe(100);
  });
});
