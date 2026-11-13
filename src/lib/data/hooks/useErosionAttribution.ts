'use client';
import { useAtomValue } from 'jotai';
import { activeSiteAtom } from '@/atoms';
import type { SiteId } from '../types';
import { useLayerData } from './useLayerData';

export interface ElevBinRow {
  Polygon_ID: string | number;
  BIN_ID: number;
  BIN_Label: string;
  erosion_kg_yr?: number;
  [k: string]: unknown;
}

export interface UseErosionAttributionResult {
  rows: ElevBinRow[];
  loading: boolean;
}

function datasetForSite(site: SiteId | null): string | null {
  if (site === 'placencia') return 'coastal-placencia-hires-elev-bins-attributes-16';
  return null;
}

export function useErosionAttribution(
  _polygonId: string | number | null,
): UseErosionAttributionResult {
  const site = useAtomValue(activeSiteAtom);
  const datasetId = datasetForSite(site);
  const { data, loading } = useLayerData<ElevBinRow[]>(datasetId);
  const rows: ElevBinRow[] = Array.isArray(data) ? data : [];
  return { rows, loading };
}
