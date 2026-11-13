'use client';
import { useMemo } from 'react';
import { useLayerData } from '@/lib/data';
import type { FoodWebGuild } from '@/types/mimes';

/**
 * Joins three published MIMES Foodweb datasets into the shape FoodWebDiagram
 * consumes. NO fallback / placeholder data — if any of the upstream datasets
 * fail or are empty, returns `guilds: []` and `available: false` so callers
 * can render an explicit empty state instead of silently faking data.
 *
 *   foodweb-guild-attributes-16  → 16 rows; ID Number, Common Name, Category
 *   foodweb-pred-prey-16         → 18 edges; Predator ID, Prey ID, Description, Utility
 *   foodweb-guild-depth-ic-biomass → 112 rows; Guild_ID × M_EBIN_ID, IC_Biomass
 *
 * The biomass field on FoodWebGuild is the SUM of IC_Biomass across all depth
 * bins for that guild (representing the canonical initial-condition total).
 */

interface CsvRows {
  rows: Record<string, unknown>[];
  row_count?: number;
  columns?: string[];
}

interface GuildAttrRow {
  'ID Number'?: number | string;
  'Common Name'?: string;
  'Category'?: string;
}

interface PredPreyRow {
  'Predator ID'?: number | string;
  'Prey ID'?: number | string;
  'Description'?: string;
  'Utility'?: number | string;
}

interface DepthIcRow {
  'Guild_ID'?: number | string;
  'IC_Biomass'?: number | string;
}

function toStr(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return String(v).trim() || null;
}

function toNum(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export interface FoodwebDataResult {
  guilds: FoodWebGuild[];
  loading: boolean;
  error: Error | null;
  /** True only when all three datasets returned non-empty rows. */
  available: boolean;
}

export function useFoodwebData(): FoodwebDataResult {
  const attrs = useLayerData<CsvRows>('foodweb-guild-attributes-16');
  const edges = useLayerData<CsvRows>('foodweb-pred-prey-16');
  const depthIc = useLayerData<CsvRows>('foodweb-guild-depth-ic-biomass');

  const loading = attrs.loading || edges.loading || depthIc.loading;
  const error = attrs.error ?? edges.error ?? depthIc.error;

  const guilds = useMemo<FoodWebGuild[]>(() => {
    const attrRows = (attrs.data?.rows ?? []) as GuildAttrRow[];
    const edgeRows = (edges.data?.rows ?? []) as PredPreyRow[];
    const depthRows = (depthIc.data?.rows ?? []) as DepthIcRow[];
    if (attrRows.length === 0 || edgeRows.length === 0) return [];

    // Sum IC_Biomass per guild across all depth bins.
    const biomassByGuildId = new Map<string, number>();
    for (const r of depthRows) {
      const gid = toStr(r['Guild_ID']);
      if (gid === null) continue;
      biomassByGuildId.set(gid, (biomassByGuildId.get(gid) ?? 0) + toNum(r['IC_Biomass']));
    }

    // preyIds per predator from the edge list.
    const preyByPredator = new Map<string, string[]>();
    for (const e of edgeRows) {
      const pred = toStr(e['Predator ID']);
      const prey = toStr(e['Prey ID']);
      if (pred === null || prey === null) continue;
      const list = preyByPredator.get(pred);
      if (list) list.push(prey);
      else preyByPredator.set(pred, [prey]);
    }

    return attrRows
      .map<FoodWebGuild | null>((row) => {
        const id = toStr(row['ID Number']);
        const name = toStr(row['Common Name']);
        if (id === null || name === null) return null;
        return {
          id,
          name,
          biomass: biomassByGuildId.get(id) ?? 0,
          preyIds: preyByPredator.get(id) ?? [],
        };
      })
      .filter((g): g is FoodWebGuild => g !== null);
  }, [attrs.data, edges.data, depthIc.data]);

  const available = guilds.length > 0;
  return { guilds, loading, error, available };
}
