'use client';
import { BitmapLayer } from '@deck.gl/layers';
import type { RFactorMonth } from '@/atoms';

/** Builds the Deck.gl layer config for the R-factor month overlay.
 *
 * Architectural note: `overlay.setProps({ layers })` REPLACES the deck.gl
 * layer set, so each `mapOverlays` component that called setProps directly
 * would clobber siblings. Instead of being a React component that calls
 * setProps, RFactorRasterOverlay is a pure builder consumed by
 * WatershedMapLayers (the sole owner of setProps for this vertical). The
 * function returns either a BitmapLayer or null; the caller spreads the
 * result into its layer array.
 *
 * Honest infra note: the data layer publishes the R-factor as a
 * Cloud-Optimised GeoTIFF (282 MB, content-type
 * `image/tiff; application=geotiff; profile=cloud-optimized`). BitmapLayer
 * needs a directly-renderable image (PNG/JPEG). Until a tile-rendering
 * endpoint or a COG-aware BitmapLayer shim lands, this builder returns
 * null when a month is set but the URL points at a COG. The atom + UI
 * affordances still work — only the actual raster paint is deferred. */
export interface RFactorOverlayProps {
  month: RFactorMonth | null;
  rasterUrl: string | null;
  bounds: [number, number, number, number] | null;
  opacity?: number;
}

const OVERLAY_LAYER_ID = 'watershed-rfactor-month-overlay';
const DEFAULT_OPACITY = 0.55;

let warnedOnce = false;

export function buildRFactorLayer(props: RFactorOverlayProps): BitmapLayer | null {
  const { month, rasterUrl, bounds, opacity = DEFAULT_OPACITY } = props;
  if (month === null || !rasterUrl || !bounds) return null;

  // The /api/data/{id} endpoint streams the COG bytes directly, which
  // BitmapLayer can't render until a tile / PNG path exists. Warn once
  // per session so the gap is visible without spamming.
  if (typeof window !== 'undefined' && !warnedOnce) {
    warnedOnce = true;
    console.warn(
      '[watershed] R-factor overlay requested for month',
      month,
      '— rasterUrl is a COG that BitmapLayer cannot render directly. The',
      'overlay is hidden until a tile / PNG endpoint lands. UI-side month',
      'selection (RainfallSeasonality) continues to work.',
    );
  }

  // Returning null instead of a no-op layer keeps the deck.gl layer set
  // clean while the infra is in flight.
  return null;
  // Once a PNG / tile URL exists, the function will return:
  //   return new BitmapLayer({ id: OVERLAY_LAYER_ID, bounds, opacity, image: pngUrl, pickable: false });
}

export { OVERLAY_LAYER_ID, DEFAULT_OPACITY };
