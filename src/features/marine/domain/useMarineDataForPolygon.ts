'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom, inspectedFeatureAtom } from '@/atoms';
import { useLayerData } from '@/lib/data/hooks/useLayerData';

// Each row from the ebin-clade-detail joined dataset.
// Clade_N_pct columns range from 1 to 25 in current CSVs.
export interface EbinRow {
  Polygon_ID: string | number;
  BIN_ID: number;
  BIN_Label: string;
  Pixel_Count?: number;
  Area_Pct_of_Polygon?: number;
  Mangrove_Pct_in_BIN?: number;
  Clade_1_pct?: number;
  Clade_2_pct?: number;
  Clade_3_pct?: number;
  Clade_4_pct?: number;
  Clade_5_pct?: number;
  Clade_6_pct?: number;
  Clade_7_pct?: number;
  Clade_8_pct?: number;
  Clade_9_pct?: number;
  Clade_10_pct?: number;
  Clade_11_pct?: number;
  Clade_12_pct?: number;
  Clade_13_pct?: number;
  Clade_14_pct?: number;
  Clade_15_pct?: number;
  Clade_16_pct?: number;
  Clade_17_pct?: number;
  Clade_18_pct?: number;
  Clade_19_pct?: number;
  Clade_20_pct?: number;
  Clade_21_pct?: number;
  Clade_22_pct?: number;
  Clade_23_pct?: number;
  Clade_24_pct?: number;
  Clade_25_pct?: number;
  [k: string]: unknown;
}

/** Maps a polygon-geometry layer id to its joined ebin-clade-detail dataset id. */
function ebinDatasetIdForLayer(layerId: string): string | null {
  const map: Record<string, string> = {
    'placencia-marine-polygons': 'placencia-marine-ebin-clade-detail',
    'placencia-coast-polygons': 'placencia-coast-ebin-clade-detail',
    'placencia-30polygons-shape': 'placencia-30polygons-ebin-clade-detail',
    'cayecaulker-marine-polygons': 'cayecaulker-marine-ebin-clade-detail',
    'cayecaulker-coast-polygons': 'cayecaulker-coast-ebin-clade-detail',
    'cayecaulker-site': 'cayecaulker-mimes-ebin-clade-detail',
  };
  return map[layerId] ?? null;
}

export interface MarineDataForPolygon {
  /** Currently-active site id or null. */
  activeSite: string | null;
  /** The currently-inspected feature hit or null. */
  feature: ReturnType<typeof useAtomValue<typeof inspectedFeatureAtom>>;
  /** The polygon key used to join against ebin rows (MIMES_ID / id / ID / GRID_ID / Name). */
  polygonKey: string | number | null;
  /** Ebin-clade-detail rows whose Polygon_ID matches the inspected polygon. */
  matchingRows: EbinRow[];
}

/**
 * Returns the joined ebin-clade-detail rows for the active inspected polygon.
 * Returns `matchingRows: []` when no polygon is inspected or no dataset exists
 * for the active layer — safe to call unconditionally.
 */
export function useMarineDataForPolygon(): MarineDataForPolygon {
  const activeSite = useAtomValue(activeSiteAtom);
  const feature = useAtomValue(inspectedFeatureAtom);

  const ebinDatasetId = feature ? ebinDatasetIdForLayer(feature.layerId) : null;
  const { data: ebinRows } = useLayerData<EbinRow[]>(ebinDatasetId);

  const props = (feature?.properties ?? {}) as Record<string, unknown>;
  const polygonKey =
    (props.MIMES_ID as string | number | undefined) ??
    (props.id as string | number | undefined) ??
    (props.ID as string | number | undefined) ??
    (props.GRID_ID as string | undefined) ??
    (props.Name as string | undefined) ??
    null;

  // CSV may store Polygon_ID as a float string ('17.0') or integer ('17') or number;
  // coerce both sides to string, then strip trailing '.0' for a clean comparison.
  const normalise = (v: string | number): string =>
    String(v).replace(/\.0+$/, '');

  // Some API responses wrap CSV rows in {type:'FeatureCollection', features:[...]}
  // when the dataset is GeoJSON-typed; only an array of rows is meaningful here.
  const rows: EbinRow[] = Array.isArray(ebinRows) ? ebinRows : [];
  const matchingRows: EbinRow[] =
    polygonKey !== null
      ? rows.filter((r) => normalise(r.Polygon_ID) === normalise(polygonKey))
      : [];

  return { activeSite, feature, polygonKey, matchingRows };
}
