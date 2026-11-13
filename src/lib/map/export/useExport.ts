'use client';
// src/lib/map/export/useExport.ts
// ME-013 export hook. Returns bound functions that run against the live
// map + layer store:
//   - exportPng({ frameElement? }) — if `frameElement` given, uses
//     html-to-image so legends + HTML overlays are baked into the PNG.
//     Otherwise falls back to the MapLibre canvas alone.
//   - exportGeoJson(layerId) — walks the layer store for the source,
//     emits a FeatureCollection Blob.
//   - exportCsv(layerId) — same source, RFC-4180 serialized.
//
// Filenames include the active site (if any) and today's date.

import { useCallback } from 'react';
import { useAtomValue } from 'jotai';
import { toBlob as htmlToImageBlob } from 'html-to-image';
import type { Feature, FeatureCollection } from 'geojson';
import { useMapContext } from '../core/MapContext';
import { useLayerStore } from '../core/MapEngineProvider';
import { activeSiteAtom } from '@/atoms';
import { isMaplibreLayer } from '../layers/styleInterpret';
import {
  LayerNotExportableError,
  featuresToCsv,
  featuresToGeoJson,
  buildFilename,
  downloadBlob,
} from './exportFormats';
import { LayerNotFoundError, type LayerConfig } from '../layers/types';

export interface ExportApi {
  exportPng(opts?: { frameElement?: HTMLElement; download?: boolean }): Promise<Blob>;
  exportGeoJson(layerId: string, opts?: { download?: boolean }): Promise<Blob>;
  exportCsv(layerId: string, opts?: { download?: boolean }): Promise<Blob>;
}

/** Composite the live map canvas + an html-to-image snapshot of the frame
 *  into a single PNG Blob. Needed because `html-to-image` uses SVG
 *  `foreignObject` under the hood, which cannot capture WebGL contents —
 *  the map area would otherwise be transparent. Sequence:
 *
 *    1. Snapshot the WebGL map canvas via native `toDataURL` (fast, perfect).
 *    2. Snapshot the full frame with html-to-image — the map area is blank,
 *       but the HTML overlays (legends, toolbars, coord chips) come through.
 *    3. Draw both onto a fresh 2D canvas: map first, HTML on top.
 */
async function compositeFrame(frameElement: HTMLElement, mapCanvas: HTMLCanvasElement): Promise<Blob> {
  const dpr = window.devicePixelRatio || 1;
  const frameRect = frameElement.getBoundingClientRect();
  const mapRect = mapCanvas.getBoundingClientRect();
  const outWidth = Math.round(frameRect.width * dpr);
  const outHeight = Math.round(frameRect.height * dpr);
  const offsetX = Math.round((mapRect.left - frameRect.left) * dpr);
  const offsetY = Math.round((mapRect.top - frameRect.top) * dpr);
  const mapWidth = Math.round(mapRect.width * dpr);
  const mapHeight = Math.round(mapRect.height * dpr);

  // 1 & 2 run in parallel — neither touches the other.
  const mapDataUrl = mapCanvas.toDataURL('image/png');
  const overlayBlob = await htmlToImageBlob(frameElement, {
    pixelRatio: dpr,
    cacheBust: true,
    // Skip the WebGL canvas during html-to-image — we composite it manually.
    filter: (node) => !(node instanceof HTMLCanvasElement),
  });
  if (!overlayBlob) throw new Error('Failed to rasterize frame overlay');

  const [mapImg, overlayImg] = await Promise.all([
    loadImage(mapDataUrl),
    loadImage(URL.createObjectURL(overlayBlob)),
  ]);

  const out = document.createElement('canvas');
  out.width = outWidth;
  out.height = outHeight;
  const ctx = out.getContext('2d');
  if (!ctx) throw new Error('2D context unavailable');
  ctx.drawImage(mapImg, offsetX, offsetY, mapWidth, mapHeight);
  ctx.drawImage(overlayImg, 0, 0, outWidth, outHeight);

  return new Promise<Blob>((resolve, reject) => {
    out.toBlob((b) => (b ? resolve(b) : reject(new Error('composite toBlob failed'))), 'image/png');
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image ${src.slice(0, 64)}…`));
    img.src = src;
  });
}

export function useExport(): ExportApi {
  const { mapRef, isReady } = useMapContext();
  const store = useLayerStore();
  const site = useAtomValue(activeSiteAtom);

  const exportPng = useCallback(
    async ({ frameElement, download = true }: { frameElement?: HTMLElement; download?: boolean } = {}) => {
      if (!isReady) throw new Error('Map is not ready');
      const map = mapRef.current;
      if (!map) throw new Error('Map instance not available');

      // Always start by forcing a synchronous render so the WebGL drawing
      // buffer reflects the current view (preserveDrawingBuffer is on).
      map.triggerRepaint();
      await new Promise<void>((resolve) => {
        map.once('render', () => resolve());
      });

      let blob: Blob;
      if (frameElement) {
        blob = await compositeFrame(frameElement, map.getCanvas());
      } else {
        blob = await new Promise<Blob>((resolve, reject) => {
          map.getCanvas().toBlob((b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))), 'image/png');
        });
      }

      if (download) {
        downloadBlob(blob, buildFilename({ site, extension: 'png' }));
      }
      return blob;
    },
    [mapRef, isReady, site],
  );

  const getLayerFeatures = (layerId: string): Feature[] => {
    const cfg = store.get(layerId) as LayerConfig | undefined;
    if (!cfg) throw new LayerNotFoundError(layerId);
    // MapLibre geojson source:
    if (isMaplibreLayer(cfg) && cfg.source.kind === 'geojson') {
      const data = cfg.source.data;
      if (typeof data === 'string') {
        throw new LayerNotExportableError(layerId, 'source is a URL — feature data not in memory');
      }
      if ((data as FeatureCollection).type === 'FeatureCollection') {
        return (data as FeatureCollection).features;
      }
      if ((data as Feature).type === 'Feature') return [data as Feature];
      throw new LayerNotExportableError(layerId, 'unrecognized geojson shape');
    }
    // Deck array source carrying point/feature-like rows:
    if ('source' in cfg && cfg.source.kind === 'array') {
      const rows = cfg.source.data as unknown[];
      // If rows look like GeoJSON features already, pass through.
      const first = rows[0] as { type?: string; geometry?: unknown } | undefined;
      if (first?.type === 'Feature' && first.geometry) return rows as Feature[];
      throw new LayerNotExportableError(
        layerId,
        'deck array source — wrap rows as GeoJSON features for export',
      );
    }
    throw new LayerNotExportableError(layerId, `source kind "${cfg.source.kind}" is not exportable`);
  };

  const exportGeoJson = useCallback(
    async (layerId: string, { download = true }: { download?: boolean } = {}) => {
      const features = getLayerFeatures(layerId);
      const fc = featuresToGeoJson(features);
      const blob = new Blob([JSON.stringify(fc)], { type: 'application/geo+json' });
      if (download) {
        downloadBlob(blob, buildFilename({ site, layerId, extension: 'geojson' }));
      }
      return blob;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [site, store],
  );

  const exportCsv = useCallback(
    async (layerId: string, { download = true }: { download?: boolean } = {}) => {
      const features = getLayerFeatures(layerId);
      const csv = featuresToCsv(features);
      const blob = new Blob([csv], { type: 'text/csv' });
      if (download) {
        downloadBlob(blob, buildFilename({ site, layerId, extension: 'csv' }));
      }
      return blob;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [site, store],
  );

  return { exportPng, exportGeoJson, exportCsv };
}
