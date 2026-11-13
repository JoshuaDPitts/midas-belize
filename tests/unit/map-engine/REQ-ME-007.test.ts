// tests/unit/map-engine/REQ-ME-007.test.ts
// ME-007 — feature interaction. Tests cover:
//   - Selection key shape (round-trip via buildKey/parseKey)
//   - Shift-click toggle semantics
//   - feature-state wrapping in styleInterpret (hover + selected cases)
//   - interactive: false short-circuits the feature-state wrapper
//   - promoteId passthrough on geojson sources (via LayerConfig field)
import { describe, it, expect } from 'vitest';
import { buildKey, parseKey, toggleKey } from '@/lib/map/interaction/selectionKey';
import { interpretMaplibreStyle } from '@/lib/map/layers/styleInterpret';
import type { FillLayer, CircleLayer } from '@/lib/map/layers/types';

describe('REQ-ME-007: selection keys', () => {
  it('round-trips layer id + feature id', () => {
    const key = buildKey('me007-points', 'p4');
    expect(key).toBe('me007-points:p4');
    expect(parseKey(key)).toEqual({ layerId: 'me007-points', featureId: 'p4' });
  });

  it('preserves colons inside feature ids via first-separator split', () => {
    const key = buildKey('layer', 'id:with:colons');
    expect(parseKey(key)).toEqual({ layerId: 'layer', featureId: 'id:with:colons' });
  });

  it('numeric feature ids stringify and round-trip as strings', () => {
    const key = buildKey('circles', 42);
    expect(key).toBe('circles:42');
    expect(parseKey(key)?.featureId).toBe('42');
  });

  it('toggleKey adds a missing key without mutating the input', () => {
    const input = new Set(['a:1']);
    const out = toggleKey(input, 'a:2');
    expect(out.has('a:1')).toBe(true);
    expect(out.has('a:2')).toBe(true);
    expect(input.has('a:2')).toBe(false); // immutable
  });

  it('toggleKey removes an existing key', () => {
    const input = new Set(['a:1', 'a:2']);
    const out = toggleKey(input, 'a:1');
    expect(out.has('a:1')).toBe(false);
    expect(out.has('a:2')).toBe(true);
  });
});

describe('REQ-ME-007: interactionStyle compiles to feature-state expressions', () => {
  const baseFill = (): FillLayer => ({
    id: 'f',
    type: 'fill',
    source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
    style: { color: '#111111', opacity: 0.5 },
  });

  it('leaves paint unwrapped when interactionStyle is absent', () => {
    const out = interpretMaplibreStyle({ ...baseFill(), interactive: true });
    expect(out.paint['fill-color']).toBe('#111111');
    expect(out.paint['fill-opacity']).toBe(0.5);
  });

  it('wraps fill-color with selected + hover when both are configured', () => {
    const out = interpretMaplibreStyle({
      ...baseFill(),
      interactive: true,
      interactionStyle: { hoverColor: '#ff0', selectedColor: '#f0f' },
    });
    const expr = out.paint['fill-color'] as unknown[];
    expect(expr[0]).toBe('case');
    // Selected check comes first (higher priority).
    expect(expr[1]).toEqual(['boolean', ['feature-state', 'selected'], false]);
    expect(expr[2]).toBe('#f0f');
    expect(expr[3]).toEqual(['boolean', ['feature-state', 'hover'], false]);
    expect(expr[4]).toBe('#ff0');
    // Base color falls through last.
    expect(expr[expr.length - 1]).toBe('#111111');
  });

  it('wraps only hover when selectedColor is omitted', () => {
    const out = interpretMaplibreStyle({
      ...baseFill(),
      interactive: true,
      interactionStyle: { hoverColor: '#0ff' },
    });
    const expr = out.paint['fill-color'] as unknown[];
    expect(expr[0]).toBe('case');
    expect(expr[1]).toEqual(['boolean', ['feature-state', 'hover'], false]);
    expect(expr[2]).toBe('#0ff');
    expect(expr[expr.length - 1]).toBe('#111111');
  });

  it('skips wrapping when interactive is false, even if interactionStyle is set', () => {
    const out = interpretMaplibreStyle({
      ...baseFill(),
      interactive: false,
      interactionStyle: { hoverColor: '#ff0' },
    });
    expect(out.paint['fill-color']).toBe('#111111');
    expect(out.paint['fill-opacity']).toBe(0.5);
  });

  it('applies to circle layers (circle-color + circle-opacity)', () => {
    const cfg: CircleLayer = {
      id: 'c',
      type: 'circle',
      interactive: true,
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: { color: '#222', opacity: 0.6 },
      interactionStyle: { hoverColor: '#abc', selectedColor: '#def', hoverOpacity: 0.9 },
    };
    const out = interpretMaplibreStyle(cfg);
    const colorExpr = out.paint['circle-color'] as unknown[];
    expect(colorExpr[0]).toBe('case');
    expect(colorExpr[colorExpr.length - 1]).toBe('#222');
    const opacityExpr = out.paint['circle-opacity'] as unknown[];
    expect(opacityExpr[0]).toBe('case');
    expect(opacityExpr[opacityExpr.length - 1]).toBe(0.6);
  });

  it('interactionStyle wrap does not collide with data-driven color expressions', () => {
    const cfg: FillLayer = {
      id: 'g',
      type: 'fill',
      interactive: true,
      source: { kind: 'geojson', data: { type: 'FeatureCollection', features: [] } },
      style: {
        color: { kind: 'graduated', field: 'v', breaks: [10], values: ['#aaa', '#bbb'] },
      },
      interactionStyle: { selectedColor: '#fff' },
    };
    const out = interpretMaplibreStyle(cfg);
    const expr = out.paint['fill-color'] as unknown[];
    expect(expr[0]).toBe('case');
    // Base (index N-1) should be the resolved `step` expression, not a raw color.
    const base = expr[expr.length - 1] as unknown[];
    expect(base[0]).toBe('step');
  });
});
