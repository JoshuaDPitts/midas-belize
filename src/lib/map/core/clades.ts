/**
 * Canonical clade catalog for the MIMES/MIDAS 25-clade UNESCO ecosystem scheme.
 *
 * The `ebin-clade-detail` datasets carry `Clade_1_pct … Clade_25_pct` columns,
 * and those indices are keyed to the "Value → Ecosystem" mapping in the source
 * workbook `reference/MIMES_MIDAS/Processed Output/ecosystem_clades.xlsx`. Names
 * below are transcribed verbatim from that workbook. The reference tree is
 * read-only, so this module is the committed materialisation of that mapping.
 *
 * Colors are assigned by ecological family (greens for forest, blues for marine,
 * etc.) so the map legend reads as a land-to-sea gradient rather than 25 arbitrary
 * hues. Every clade gets its own distinct RGB — there is no 8-color modulo wrap.
 */

export type CladeFamily =
  | 'agriculture'
  | 'forest'
  | 'savanna'
  | 'shrubland'
  | 'mangrove'
  | 'wetland'
  | 'freshwater'
  | 'marine'
  | 'built';

export interface CladeMeta {
  /** 1-indexed clade id, matching the `Clade_N_pct` column suffix. */
  id: number;
  /** Verbatim UNESCO ecosystem name from ecosystem_clades.xlsx. */
  name: string;
  /** Ecological family used for color grouping and legend sections. */
  family: CladeFamily;
  /** Display RGB (0-255) for map fills and legend swatches. */
  rgb: readonly [number, number, number];
}

export interface CladeFamilyMeta {
  key: CladeFamily;
  /** Human-readable section heading for the legend. */
  label: string;
}

export const CLADE_COUNT = 25;

export const CLADES: readonly CladeMeta[] = [
  { id: 1, name: 'Agricultural uses', family: 'agriculture', rgb: [222, 184, 100] },
  { id: 2, name: 'Coral reef', family: 'marine', rgb: [235, 110, 140] },
  { id: 3, name: 'Lowland broad-leaved dry forest', family: 'forest', rgb: [190, 214, 120] },
  { id: 4, name: 'Lowland broad-leaved moist forest', family: 'forest', rgb: [138, 196, 102] },
  { id: 5, name: 'Lowland broad-leaved moist forest: Steep', family: 'forest', rgb: [112, 176, 86] },
  { id: 6, name: 'Lowland broad-leaved moist scrub forest', family: 'forest', rgb: [164, 200, 96] },
  { id: 7, name: 'Lowland broad-leaved moist scrub forest: Steep', family: 'forest', rgb: [140, 178, 80] },
  { id: 8, name: 'Lowland broad-leaved wet forest', family: 'forest', rgb: [96, 184, 116] },
  { id: 9, name: 'Lowland broad-leaved wet forest: Steep', family: 'forest', rgb: [76, 160, 100] },
  { id: 10, name: 'Lowland pine forest', family: 'forest', rgb: [120, 192, 150] },
  { id: 11, name: 'Lowland savanna', family: 'savanna', rgb: [214, 198, 122] },
  { id: 12, name: 'Mangrove and littoral forest', family: 'mangrove', rgb: [40, 158, 138] },
  { id: 13, name: 'Open sea', family: 'marine', rgb: [45, 95, 190] },
  { id: 14, name: 'Seagrass', family: 'marine', rgb: [70, 200, 195] },
  { id: 15, name: 'Shrubland', family: 'shrubland', rgb: [188, 166, 88] },
  { id: 16, name: 'Submontane broad-leaved moist forest', family: 'forest', rgb: [70, 150, 86] },
  { id: 17, name: 'Submontane broad-leaved moist forest: Steep', family: 'forest', rgb: [56, 130, 72] },
  { id: 18, name: 'Submontane broad-leaved wet forest', family: 'forest', rgb: [52, 142, 104] },
  { id: 19, name: 'Submontane broad-leaved wet forest: Steep', family: 'forest', rgb: [40, 122, 88] },
  { id: 20, name: 'Submontane pine forest', family: 'forest', rgb: [84, 158, 132] },
  { id: 21, name: 'Submontane pine forest: Steep', family: 'forest', rgb: [66, 138, 114] },
  { id: 22, name: 'Urban', family: 'built', rgb: [148, 148, 158] },
  { id: 23, name: 'Wasteland', family: 'built', rgb: [176, 156, 134] },
  { id: 24, name: 'Water', family: 'freshwater', rgb: [74, 144, 218] },
  { id: 25, name: 'Wetland', family: 'wetland', rgb: [108, 196, 178] },
];

/** Legend section order: terrestrial-cultivated → natural land → wetland → water → sea → built. */
export const CLADE_FAMILY_ORDER: readonly CladeFamilyMeta[] = [
  { key: 'agriculture', label: 'Agriculture' },
  { key: 'forest', label: 'Forest' },
  { key: 'savanna', label: 'Savanna & grassland' },
  { key: 'shrubland', label: 'Shrubland' },
  { key: 'wetland', label: 'Wetland' },
  { key: 'freshwater', label: 'Freshwater' },
  { key: 'mangrove', label: 'Mangrove' },
  { key: 'marine', label: 'Marine' },
  { key: 'built', label: 'Urban & built' },
];

const BY_ID: ReadonlyMap<number, CladeMeta> = new Map(CLADES.map((c) => [c.id, c]));

/** Returns the full metadata for a clade id, or null when missing / out of range. */
export function cladeMeta(id: number | null): CladeMeta | null {
  if (id === null) return null;
  return BY_ID.get(id) ?? null;
}

export function cladeName(id: number | null): string | null {
  return cladeMeta(id)?.name ?? null;
}

export function cladeRgb(id: number | null): readonly [number, number, number] | null {
  return cladeMeta(id)?.rgb ?? null;
}

export function cladeFamily(id: number | null): CladeFamily | null {
  return cladeMeta(id)?.family ?? null;
}

export interface CladeFamilyGroup {
  family: CladeFamilyMeta;
  clades: CladeMeta[];
}

/**
 * Groups the given clade ids into legend sections following CLADE_FAMILY_ORDER.
 * Invalid / out-of-range ids are dropped, ids are deduped, clades within a
 * family are sorted by id, and families with no present members are omitted.
 */
export function groupCladesByFamily(ids: Iterable<number>): CladeFamilyGroup[] {
  const present = new Set<number>();
  for (const id of ids) {
    if (BY_ID.has(id)) present.add(id);
  }
  const groups: CladeFamilyGroup[] = [];
  for (const family of CLADE_FAMILY_ORDER) {
    const clades = CLADES.filter((c) => c.family === family.key && present.has(c.id));
    if (clades.length > 0) groups.push({ family, clades });
  }
  return groups;
}
