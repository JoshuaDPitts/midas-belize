// src/lib/map/legends/legendFromStyle.ts
// Pure ME-010 helper: derive a LegendSpec from a LayerConfig's style.
//
// Decision order:
//   1. Data-driven StyleValue<T> on the primary paint (color / fill-color /
//      circle-color) — graduated / categorical / proportional → legend.
//   2. Deck aggregation / H3 / heatmap layers with a `colorRange` ramp →
//      continuous legend (domain derived from `domain` if set, else null).
//   3. Everything else → { kind: 'none' }.

import type { LayerConfig, StyleValue } from '../layers/types';

export interface GraduatedLegend   { kind: 'graduated';  layerId: string; label: string; unit?: string; breaks: number[]; colors: string[] }
export interface CategoricalLegend { kind: 'categorical'; layerId: string; label: string; items: { label: string; color: string }[] }
export interface ContinuousLegend  { kind: 'continuous'; layerId: string; label: string; unit?: string; colors: string[]; domain: [number, number] | null }
export interface NoneLegend        { kind: 'none';        layerId: string }

export type LegendSpec = GraduatedLegend | CategoricalLegend | ContinuousLegend | NoneLegend;

type TaggedStyleValue<T> =
  | { kind: 'constant';     value: T }
  | { kind: 'graduated';    field: string; breaks: number[]; values: T[] }
  | { kind: 'categorical';  field: string; map: Record<string, T>; fallback?: T }
  | { kind: 'proportional'; field: string; domain: [number, number]; range: [T, T] };

function taggedOrNull<T>(v: StyleValue<T> | undefined): TaggedStyleValue<T> | null {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null;
  const t = v as TaggedStyleValue<T>;
  return t.kind === 'graduated' || t.kind === 'categorical' || t.kind === 'proportional'
    ? t
    : null;
}

/** Convert `[r,g,b]` or `[r,g,b,a]` (0-255) to a CSS `rgb(...)` / `rgba(...)`. */
export function rgbToCss(c: number[]): string {
  if (c.length === 3) return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  // RGBA: keep alpha as 0-1 for CSS.
  const a = c[3] > 1 ? c[3] / 255 : c[3];
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a.toFixed(3)})`;
}

export function legendFromStyle(cfg: LayerConfig): LegendSpec {
  const layerId = cfg.id;
  const label = cfg.label ?? cfg.id;
  const unit = cfg.unit;

  // ——— Data-driven StyleValue on MapLibre primary color ———
  if (!cfg.type.startsWith('deck.')) {
    const color = inspectMaplibreColor(cfg);
    if (color) {
      const tagged = taggedOrNull<string>(color);
      if (tagged?.kind === 'graduated') {
        return {
          kind: 'graduated',
          layerId,
          label,
          unit,
          breaks: tagged.breaks,
          colors: tagged.values,
        };
      }
      if (tagged?.kind === 'categorical') {
        return {
          kind: 'categorical',
          layerId,
          label,
          items: Object.entries(tagged.map).map(([k, v]) => ({ label: k, color: v })),
        };
      }
      if (tagged?.kind === 'proportional') {
        return {
          kind: 'continuous',
          layerId,
          label,
          unit,
          colors: [tagged.range[0], tagged.range[1]],
          domain: tagged.domain,
        };
      }
    }
  }

  // ——— Deck aggregation / H3 / heatmap via `colorRange` ———
  const colorRange = inspectDeckColorRange(cfg);
  if (colorRange) {
    const domain = inspectDeckDomain(cfg);
    return {
      kind: 'continuous',
      layerId,
      label,
      unit,
      colors: colorRange.map(rgbToCss),
      domain,
    };
  }

  // ——— Deck GeoJson / Polygon / Scatterplot StyleValue<color> ———
  if (cfg.type.startsWith('deck.')) {
    const color = inspectDeckDataDrivenColor(cfg);
    if (color) {
      const tagged = taggedOrNull<[number, number, number] | [number, number, number, number]>(
        color,
      );
      if (tagged?.kind === 'graduated') {
        return {
          kind: 'graduated',
          layerId,
          label,
          unit,
          breaks: tagged.breaks,
          colors: tagged.values.map(rgbToCss),
        };
      }
      if (tagged?.kind === 'categorical') {
        return {
          kind: 'categorical',
          layerId,
          label,
          items: Object.entries(tagged.map).map(([k, v]) => ({
            label: k,
            color: rgbToCss(v as number[]),
          })),
        };
      }
      if (tagged?.kind === 'proportional') {
        return {
          kind: 'continuous',
          layerId,
          label,
          unit,
          colors: [rgbToCss(tagged.range[0] as number[]), rgbToCss(tagged.range[1] as number[])],
          domain: tagged.domain,
        };
      }
    }
  }

  return { kind: 'none', layerId };
}

// ——— Private inspectors ———

function inspectMaplibreColor(cfg: LayerConfig): StyleValue<string> | undefined {
  switch (cfg.type) {
    case 'fill':
    case 'line':
    case 'circle':
    case 'fill-extrusion':
      return (cfg.style as { color?: StyleValue<string> }).color;
    case 'symbol':
      return (cfg.style as { textColor?: StyleValue<string> }).textColor;
    default:
      return undefined;
  }
}

function inspectDeckDataDrivenColor(
  cfg: LayerConfig,
): StyleValue<[number, number, number] | [number, number, number, number]> | undefined {
  switch (cfg.type) {
    case 'deck.geojson':
      return (cfg as { style: { fillColor?: StyleValue<[number, number, number] | [number, number, number, number]> } })
        .style.fillColor;
    case 'deck.scatterplot':
      return (cfg as { style: { color?: [number, number, number] | [number, number, number, number] } })
        .style.color as StyleValue<[number, number, number] | [number, number, number, number]>;
    default:
      return undefined;
  }
}

function inspectDeckColorRange(cfg: LayerConfig): number[][] | undefined {
  if (!cfg.type.startsWith('deck.')) return undefined;
  const s = (cfg as { style?: { colorRange?: number[][] } }).style;
  return s?.colorRange;
}

function inspectDeckDomain(cfg: LayerConfig): [number, number] | null {
  if (!cfg.type.startsWith('deck.')) return null;
  const s = (cfg as { style?: { domain?: [number, number] } }).style;
  return s?.domain ?? null;
}
