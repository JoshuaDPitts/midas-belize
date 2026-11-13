import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildFlowDirectionLayer,
  _resetFlowDirectionWarning,
  type FlowVectorPayload,
} from '@/features/watershed/map/FlowDirectionArrows';

beforeEach(() => {
  _resetFlowDirectionWarning();
  vi.spyOn(console, 'warn').mockImplementation(() => {}).mockClear();
});

describe('REQ-WS-029: buildFlowDirectionLayer (FlowDirectionArrows)', () => {
  it('returns null when payload is null (404 degrade path)', () => {
    const layer = buildFlowDirectionLayer({
      data: null,
      selectedPolygonId: null,
      hoveredPolygonId: null,
    });
    expect(layer).toBeNull();
  });

  it('warns once to dev console on the degrade path', () => {
    const warn = vi.spyOn(console, 'warn');
    buildFlowDirectionLayer({ data: null, selectedPolygonId: null, hoveredPolygonId: null });
    buildFlowDirectionLayer({ data: null, selectedPolygonId: null, hoveredPolygonId: null });
    // Two calls; we should only warn once (the module-level flag suppresses)
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0].join(' ')).toMatch(/watershed-flow-vectors/);
  });

  it('returns null when features array is empty', () => {
    const empty: FlowVectorPayload = { type: 'FeatureCollection', features: [] };
    expect(
      buildFlowDirectionLayer({ data: empty, selectedPolygonId: null, hoveredPolygonId: null }),
    ).toBeNull();
  });

  it('happy path: returns an IconLayer with the supplied features', () => {
    const payload: FlowVectorPayload = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.4, 16.5] },
          properties: { polygon_id: 'Big Creek', bearing: 90 },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.3, 16.4] },
          properties: { polygon_id: 'Sennis', bearing: 180 },
        },
      ],
    };
    const layer = buildFlowDirectionLayer({
      data: payload,
      selectedPolygonId: null,
      hoveredPolygonId: null,
    });
    expect(layer).not.toBeNull();
    expect(layer!.id).toBe('watershed-flow-arrows');
    // The data prop is the features array (deck.gl convention).
    expect(layer!.props.data).toBe(payload.features);
  });

  it('selection-aware sizing/colour: highlighted feature gets larger size + full-opacity colour', () => {
    const payload: FlowVectorPayload = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.4, 16.5] },
          properties: { polygon_id: 'Big Creek', bearing: 0 },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.3, 16.4] },
          properties: { polygon_id: 'Sennis', bearing: 0 },
        },
      ],
    };
    const layer = buildFlowDirectionLayer({
      data: payload,
      selectedPolygonId: 'Big Creek',
      hoveredPolygonId: null,
    });
    expect(layer).not.toBeNull();
    // Exercise the deck.gl accessor functions directly to assert the
    // selection-aware branch fires.
    const sizeFor = layer!.props.getSize as (f: typeof payload.features[number]) => number;
    const colorFor = layer!.props.getColor as (f: typeof payload.features[number]) => [number, number, number, number];
    const big = sizeFor(payload.features[0]);
    const other = sizeFor(payload.features[1]);
    expect(big).toBeGreaterThan(other);
    const bigColor = colorFor(payload.features[0]);
    const otherColor = colorFor(payload.features[1]);
    expect(bigColor[3]).toBeGreaterThan(otherColor[3]);
  });

  it('hover highlights apply the same selection-style emphasis', () => {
    const payload: FlowVectorPayload = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.4, 16.5] },
          properties: { polygon_id: 'Big Creek', bearing: 0 },
        },
        {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [-88.3, 16.4] },
          properties: { polygon_id: 'Sennis', bearing: 0 },
        },
      ],
    };
    const layer = buildFlowDirectionLayer({
      data: payload,
      selectedPolygonId: null,
      hoveredPolygonId: 'Sennis',
    });
    const sizeFor = layer!.props.getSize as (f: typeof payload.features[number]) => number;
    expect(sizeFor(payload.features[1])).toBeGreaterThan(sizeFor(payload.features[0]));
  });
});
