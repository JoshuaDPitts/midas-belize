// src/lib/map/layers/styleInterpret.ts
import type { LayerConfig, MaplibreLayer, StyleValue } from './types';

export interface MaplibreStyleOutput {
  paint: Record<string, unknown>;
  layout: Record<string, unknown>;
  type: MaplibreLayer['type'];
}

type TaggedStyleValue<T> =
  | { kind: 'constant';     value: T }
  | { kind: 'graduated';    field: string; breaks: number[]; values: T[] }
  | { kind: 'categorical';  field: string; map: Record<string, T>; fallback?: T }
  | { kind: 'proportional'; field: string; domain: [number, number]; range: [T, T] };

function resolve<T>(v: StyleValue<T> | undefined, fallback: T): unknown {
  if (v === undefined) return fallback;
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return v as unknown;
  const tagged = v as TaggedStyleValue<T>;
  switch (tagged.kind) {
    case 'constant':
      return tagged.value;
    case 'graduated': {
      const expr: unknown[] = ['step', ['get', tagged.field], tagged.values[0]];
      for (let i = 0; i < tagged.breaks.length; i++) expr.push(tagged.breaks[i], tagged.values[i + 1]);
      return expr;
    }
    case 'categorical': {
      const expr: unknown[] = ['match', ['get', tagged.field]];
      for (const [k, val] of Object.entries(tagged.map)) expr.push(k, val);
      expr.push(tagged.fallback ?? fallback);
      return expr;
    }
    case 'proportional':
      return [
        'interpolate', ['linear'], ['get', tagged.field],
        tagged.domain[0], tagged.range[0], tagged.domain[1], tagged.range[1],
      ];
    default:
      return fallback;
  }
}

/** Wrap a base paint value with feature-state overrides. Order matters:
 * `selected` beats `hover` (same feature can be both, selection wins). */
function withFeatureState(
  base: unknown,
  hoverOverride: unknown | undefined,
  selectedOverride: unknown | undefined,
): unknown {
  if (hoverOverride === undefined && selectedOverride === undefined) return base;
  const expr: unknown[] = ['case'];
  if (selectedOverride !== undefined) {
    expr.push(['boolean', ['feature-state', 'selected'], false], selectedOverride);
  }
  if (hoverOverride !== undefined) {
    expr.push(['boolean', ['feature-state', 'hover'], false], hoverOverride);
  }
  expr.push(base);
  return expr;
}

export function interpretMaplibreStyle(layer: MaplibreLayer): MaplibreStyleOutput {
  const paint: Record<string, unknown> = {};
  const layout: Record<string, unknown> = { visibility: layer.visible === false ? 'none' : 'visible' };
  const iStyle = layer.interactive && layer.interactionStyle ? layer.interactionStyle : undefined;
  switch (layer.type) {
    case 'fill': {
      const s = layer.style;
      paint['fill-color']         = withFeatureState(resolve(s.color, '#3b82f6'), iStyle?.hoverColor, iStyle?.selectedColor);
      paint['fill-outline-color'] = resolve(s.outlineColor, 'rgba(255,255,255,0.3)');
      paint['fill-opacity']       = withFeatureState(resolve(s.opacity, 0.8), iStyle?.hoverOpacity, iStyle?.selectedOpacity);
      break;
    }
    case 'line': {
      const s = layer.style;
      paint['line-color']   = withFeatureState(resolve(s.color, '#3b82f6'), iStyle?.hoverColor, iStyle?.selectedColor);
      paint['line-width']   = resolve(s.width, 2);
      paint['line-opacity'] = withFeatureState(resolve(s.opacity, 1), iStyle?.hoverOpacity, iStyle?.selectedOpacity);
      if (s.dasharray) paint['line-dasharray'] = s.dasharray;
      break;
    }
    case 'circle': {
      const s = layer.style;
      paint['circle-color']        = withFeatureState(resolve(s.color, '#3b82f6'), iStyle?.hoverColor, iStyle?.selectedColor);
      paint['circle-radius']       = resolve(s.radius, 6);
      paint['circle-stroke-color'] = resolve(s.strokeColor, '#fff');
      paint['circle-stroke-width'] = resolve(s.strokeWidth, 1);
      paint['circle-opacity']      = withFeatureState(resolve(s.opacity, 1), iStyle?.hoverOpacity, iStyle?.selectedOpacity);
      break;
    }
    case 'symbol': {
      const s = layer.style;
      if (s.icon !== undefined)      layout['icon-image']  = resolve(s.icon, '');
      if (s.iconSize !== undefined)  layout['icon-size']   = resolve(s.iconSize, 1);
      if (s.text !== undefined)      layout['text-field']  = resolve(s.text, '');
      if (s.textSize !== undefined)  layout['text-size']   = resolve(s.textSize, 12);
      if (s.textColor !== undefined) paint['text-color']   = resolve(s.textColor, '#000');
      break;
    }
    case 'fill-extrusion': {
      const s = layer.style;
      paint['fill-extrusion-color']   = resolve(s.color, '#3b82f6');
      paint['fill-extrusion-height']  = resolve(s.height, 0);
      paint['fill-extrusion-base']    = resolve(s.base, 0);
      paint['fill-extrusion-opacity'] = resolve(s.opacity, 0.8);
      break;
    }
    case 'raster':
      paint['raster-opacity'] = layer.style.opacity ?? 1;
      break;
    case 'hillshade':
      if (layer.style.shadowColor)    paint['hillshade-shadow-color']    = layer.style.shadowColor;
      if (layer.style.highlightColor) paint['hillshade-highlight-color'] = layer.style.highlightColor;
      break;
    case 'heatmap': {
      const s = layer.style;
      paint['heatmap-weight']    = resolve(s.weight, 1);
      paint['heatmap-radius']    = resolve(s.radius, 20);
      paint['heatmap-intensity'] = s.intensity ?? 1;
      if (s.colorRamp && s.colorRamp.length >= 2) {
        const expr: unknown[] = ['interpolate', ['linear'], ['heatmap-density']];
        const n = s.colorRamp.length;
        for (let i = 0; i < n; i++) expr.push(i / (n - 1), s.colorRamp[i]);
        paint['heatmap-color'] = expr;
      }
      break;
    }
    case 'background':
      paint['background-color'] = layer.style.color ?? '#000';
      break;
  }
  return { paint, layout, type: layer.type };
}

export function isMaplibreLayer(c: LayerConfig): c is MaplibreLayer {
  return !c.type.startsWith('deck.');
}

/** Normalized Deck view for downstream helpers (legend engine, devtools, etc).
 *  The factory in `deckLayers.ts` does the heavy lifting; this helper just
 *  surfaces the visibility + opacity that every Deck variant shares. */
export function interpretDeckProps(cfg: LayerConfig): { visible: boolean; opacity: number } {
  return { visible: cfg.visible !== false, opacity: cfg.opacity ?? 1 };
}
