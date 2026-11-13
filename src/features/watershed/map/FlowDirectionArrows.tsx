'use client';
import { IconLayer } from '@deck.gl/layers';

/** Per-feature arrow descriptor parsed out of the watershed-flow-vectors
 * GeoJSON. The published shape is one Point feature per drainage
 * pour-point, with a `bearing` (degrees clockwise from north) and a
 * `polygon_id` identifying the originating watershed. */
export interface FlowVectorFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: [number, number] };
  properties: {
    polygon_id?: string | number;
    bearing?: number;
    magnitude?: number;
    [k: string]: unknown;
  };
}

export interface FlowVectorPayload {
  type: 'FeatureCollection';
  features: FlowVectorFeature[];
}

let warnedOnce = false;

/** Inline-SVG arrow encoded as a data URL. Tiny enough to embed without
 * pulling a separate sprite sheet; rotates per-feature via getAngle. */
const ARROW_ICON_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 2 L22 22 L12 16 L2 22 Z" fill="rgba(255,255,255,0.95)" stroke="rgba(0,0,0,0.4)" stroke-width="1"/></svg>',
  );

export interface BuildFlowLayerProps {
  data: FlowVectorPayload | null;
  selectedPolygonId: string | number | null;
  hoveredPolygonId: string | number | null;
}

/** Builds the Deck.gl IconLayer for the FlowDirectionArrows overlay.
 * Returns null when no payload is available (i.e. the
 * watershed-flow-vectors dataset is unpublished / 404), warns once so
 * the gap is visible in dev. When the dataset lands, the layer renders
 * arrows oriented by per-feature `bearing` and brightens features whose
 * `polygon_id` matches the currently-selected or hovered polygon. */
export function buildFlowDirectionLayer(props: BuildFlowLayerProps): IconLayer | null {
  const { data, selectedPolygonId, hoveredPolygonId } = props;
  if (!data || !Array.isArray(data.features) || data.features.length === 0) {
    if (typeof window !== 'undefined' && !warnedOnce) {
      warnedOnce = true;
      console.warn(
        '[watershed] FlowDirectionArrows: watershed-flow-vectors is not',
        'published yet — layer degrades to null. Once the dataset lands,',
        'the arrows render automatically without further code changes.',
      );
    }
    return null;
  }

  const selectedKey = selectedPolygonId === null ? null : String(selectedPolygonId);
  const hoveredKey = hoveredPolygonId === null ? null : String(hoveredPolygonId);

  return new IconLayer<FlowVectorFeature>({
    id: 'watershed-flow-arrows',
    data: data.features,
    pickable: false,
    iconAtlas: ARROW_ICON_URL,
    iconMapping: {
      arrow: { x: 0, y: 0, width: 24, height: 24, anchorY: 12, mask: false },
    },
    getIcon: () => 'arrow',
    getPosition: (f) => f.geometry.coordinates,
    getAngle: (f) => -(f.properties.bearing ?? 0), // deck.gl rotates CCW
    sizeUnits: 'pixels' as const,
    getSize: (f) => {
      const polygonId = f.properties.polygon_id;
      const k = polygonId === null || polygonId === undefined ? null : String(polygonId);
      const isHighlighted =
        (selectedKey !== null && k === selectedKey) ||
        (hoveredKey !== null && k === hoveredKey);
      return isHighlighted ? 24 : 18;
    },
    getColor: (f) => {
      const polygonId = f.properties.polygon_id;
      const k = polygonId === null || polygonId === undefined ? null : String(polygonId);
      const isHighlighted =
        (selectedKey !== null && k === selectedKey) ||
        (hoveredKey !== null && k === hoveredKey);
      return isHighlighted ? [255, 255, 255, 255] : [255, 255, 255, 180];
    },
    updateTriggers: {
      getSize: [selectedKey, hoveredKey],
      getColor: [selectedKey, hoveredKey],
    },
  });
}

/** Reset the warning flag — used by tests so the warning fires fresh per
 * test run instead of being suppressed by module-level state. */
export function _resetFlowDirectionWarning(): void {
  warnedOnce = false;
}
