// src/lib/map/export/exportFormats.ts
// Pure export serializers for ME-013. No React, no MapLibre references —
// just data-in, string-out. GeoJSON is trivial; CSV follows RFC 4180
// (double-quote field values containing commas / newlines / quotes, and
// escape embedded quotes by doubling them).

import type { Feature, FeatureCollection, Geometry } from 'geojson';

export class LayerNotExportableError extends Error {
  constructor(layerId: string, reason: string) {
    super(`Layer "${layerId}" is not exportable: ${reason}`);
    this.name = 'LayerNotExportableError';
  }
}

/** Escape a single value per RFC 4180. Numbers + booleans emit unquoted;
 *  strings containing `,`, `"`, CR or LF are wrapped in quotes with any
 *  embedded `"` doubled. `null` / `undefined` become empty fields. */
export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize a FeatureCollection as RFC-4180 CSV — one row per feature,
 *  one column per property key observed anywhere in the collection. */
export function featuresToCsv(features: readonly Feature[]): string {
  if (features.length === 0) return '';
  // Union of property keys across all features, preserving first-seen order.
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const f of features) {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    for (const k of Object.keys(props)) {
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
    }
  }
  const header = keys.map(csvEscape).join(',');
  const rows = features.map((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    return keys.map((k) => csvEscape(props[k])).join(',');
  });
  return [header, ...rows].join('\r\n');
}

/** Wrap a feature array in a well-formed FeatureCollection. */
export function featuresToGeoJson(features: readonly Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: features.map((f) => ({
      type: 'Feature',
      geometry: f.geometry as Geometry,
      properties: f.properties ?? {},
    })),
  };
}

export interface FilenameParts {
  /** Optional site slug (e.g. "laughing-bird"). */
  site?: string | null;
  /** Layer id — only included for per-layer exports (geojson / csv). */
  layerId?: string;
  /** Explicit date override; otherwise `new Date()`. */
  date?: Date;
  /** Extension WITHOUT the leading dot, e.g. "png" / "geojson" / "csv". */
  extension: string;
}

/** Build a downloaded filename: `midas-belize[-site][-layer]-YYYY-MM-DD.ext`. */
export function buildFilename(parts: FilenameParts): string {
  const d = parts.date ?? new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const bits = ['midas-belize'];
  if (parts.site) bits.push(parts.site);
  if (parts.layerId) bits.push(parts.layerId);
  bits.push(date);
  return `${bits.join('-')}.${parts.extension}`;
}

/** Trigger a browser download of `blob` named `filename`. Swallows
 *  the temporary anchor DOM mutation so callers don't worry about it. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so the browser has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
