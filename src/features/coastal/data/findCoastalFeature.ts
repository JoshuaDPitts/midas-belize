/**
 * REQ-CO-007: findCoastalFeature utility
 *
 * Locate a coastal polygon feature in a GeoJSON FeatureCollection by its
 * Polygon_ID property. Returns null when the collection or id is absent.
 *
 * The coastal geometry datasets use `Polygon_ID` as their primary key
 * (both hires: placencia-30polygons-shape and lores: placencia-coast-polygons).
 */
import type { Feature, FeatureCollection } from 'geojson';

/**
 * Find a feature in the given FeatureCollection whose `Polygon_ID` property
 * matches the supplied `polygonId` string.
 *
 * @param fc        The GeoJSON FeatureCollection to search (may be null).
 * @param polygonId The target Polygon_ID value (may be null).
 * @returns The matching Feature, or null if not found.
 */
export function findCoastalFeature(
  fc: FeatureCollection | null,
  polygonId: string | null,
): Feature | null {
  if (!fc || !polygonId) return null;
  for (const feature of fc.features) {
    const props = feature.properties ?? {};
    const id =
      props['Polygon_ID'] !== undefined && props['Polygon_ID'] !== null
        ? String(props['Polygon_ID'])
        : null;
    if (id === polygonId) return feature;
  }
  return null;
}
