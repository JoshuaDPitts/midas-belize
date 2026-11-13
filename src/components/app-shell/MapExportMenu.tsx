'use client';
// src/components/app-shell/MapExportMenu.tsx
// MC-006 export menu. Lives in the MapChrome right-edge control column.
// PNG capture runs against the live map canvas via useExport().exportPng.
// GeoJSON / CSV use the pure serializers against the active vertical's
// `exportableFeaturesAtom` source, narrowed to the current selection when
// one is active. Verticals publish that source in MC-007 — until then the
// data buttons sit disabled.
import { useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import type { Feature } from 'geojson';
import { exportableFeaturesAtom, selectionAtom, activeSiteAtom } from '@/atoms';
import {
  useExport,
  featuresToGeoJson,
  featuresToCsv,
  buildFilename,
  downloadBlob,
  parseKey,
} from '@/lib/map';
import { FloatingToolbar } from '@/components/map/FloatingToolbar/FloatingToolbar';

/** Narrow `features` to the subset selected in `selection` for this layer.
 *  An empty selection (or one that matches no feature on this layer) exports
 *  the whole layer. Feature identity falls back across `id` → `Polygon_ID`
 *  → `MIMES_ID` to cover both renderer-assigned and dataset-native keys. */
function selectedSubset(features: Feature[], layerId: string, selection: Set<string>): Feature[] {
  if (selection.size === 0) return features;
  const ids = new Set(
    [...selection]
      .map((k) => parseKey(k))
      .filter((p): p is { layerId: string; featureId: string } => p !== null && p.layerId === layerId)
      .map((p) => p.featureId),
  );
  if (ids.size === 0) return features;
  return features.filter((f) => {
    const props = (f.properties ?? {}) as Record<string, unknown>;
    const id = f.id ?? props.Polygon_ID ?? props.MIMES_ID;
    return ids.has(String(id));
  });
}

export function MapExportMenu() {
  const { exportPng } = useExport();
  const source = useAtomValue(exportableFeaturesAtom);
  const selection = useAtomValue(selectionAtom);
  const site = useAtomValue(activeSiteAtom);
  const [open, setOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const data = source ? selectedSubset(source.features, source.layerId, selection) : [];

  return (
    <div data-testid="map-export" ref={frameRef}>
      <FloatingToolbar actions={[{ name: 'Export', icon: 'export', onClick: () => setOpen((o) => !o) }]} />
      {open && (
        <div role="menu" data-testid="export-menu">
          <button data-testid="export-png" onClick={() => void exportPng({ download: true })}>
            PNG
          </button>
          <button
            data-testid="export-geojson"
            disabled={!source}
            onClick={() => {
              const blob = new Blob([JSON.stringify(featuresToGeoJson(data))], {
                type: 'application/geo+json',
              });
              downloadBlob(blob, buildFilename({ site, layerId: source?.layerId, extension: 'geojson' }));
            }}
          >
            GeoJSON
          </button>
          <button
            data-testid="export-csv"
            disabled={!source}
            onClick={() => {
              const blob = new Blob([featuresToCsv(data)], { type: 'text/csv' });
              downloadBlob(blob, buildFilename({ site, layerId: source?.layerId, extension: 'csv' }));
            }}
          >
            CSV
          </button>
        </div>
      )}
    </div>
  );
}
