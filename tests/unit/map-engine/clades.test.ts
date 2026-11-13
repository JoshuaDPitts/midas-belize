import { describe, it, expect } from 'vitest';
import {
  CLADES,
  CLADE_COUNT,
  CLADE_FAMILY_ORDER,
  cladeMeta,
  cladeName,
  cladeRgb,
  cladeFamily,
  groupCladesByFamily,
} from '@/lib/map/core/clades';

describe('clade catalog (ecosystem_clades.xlsx, 25-clade UNESCO scheme)', () => {
  it('exposes 25 clades with contiguous 1..25 ids in order', () => {
    expect(CLADE_COUNT).toBe(25);
    expect(CLADES).toHaveLength(25);
    expect(CLADES.map((c) => c.id)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });

  it('labels each clade with its verbatim UNESCO ecosystem name', () => {
    // Spot-check the anchors across families, names copied exactly from the source workbook.
    expect(cladeName(1)).toBe('Agricultural uses');
    expect(cladeName(2)).toBe('Coral reef');
    expect(cladeName(12)).toBe('Mangrove and littoral forest');
    expect(cladeName(13)).toBe('Open sea');
    expect(cladeName(14)).toBe('Seagrass');
    expect(cladeName(22)).toBe('Urban');
    expect(cladeName(24)).toBe('Water');
    expect(cladeName(25)).toBe('Wetland');
  });

  it('assigns each clade to an ecological family for color grouping', () => {
    expect(cladeFamily(1)).toBe('agriculture');
    expect(cladeFamily(2)).toBe('marine'); // coral reef
    expect(cladeFamily(4)).toBe('forest'); // lowland broad-leaved moist forest
    expect(cladeFamily(11)).toBe('savanna');
    expect(cladeFamily(12)).toBe('mangrove');
    expect(cladeFamily(13)).toBe('marine'); // open sea
    expect(cladeFamily(15)).toBe('shrubland');
    expect(cladeFamily(20)).toBe('forest'); // submontane pine forest
    expect(cladeFamily(22)).toBe('built'); // urban
    expect(cladeFamily(23)).toBe('built'); // wasteland
    expect(cladeFamily(24)).toBe('freshwater'); // water
    expect(cladeFamily(25)).toBe('wetland');
  });

  it('gives every clade a valid RGB triple', () => {
    for (const c of CLADES) {
      expect(c.rgb).toHaveLength(3);
      for (const channel of c.rgb) {
        expect(Number.isInteger(channel)).toBe(true);
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it('assigns a distinct color to every clade (no >8 modulo collisions)', () => {
    const seen = new Set(CLADES.map((c) => c.rgb.join(',')));
    expect(seen.size).toBe(25);
  });

  it('orders families and covers every family a clade uses', () => {
    const usedFamilies = new Set(CLADES.map((c) => c.family));
    const orderedKeys = new Set(CLADE_FAMILY_ORDER.map((f) => f.key));
    for (const fam of usedFamilies) {
      expect(orderedKeys.has(fam)).toBe(true);
    }
    // Every ordered family entry carries a human-readable label.
    for (const f of CLADE_FAMILY_ORDER) {
      expect(f.label.length).toBeGreaterThan(0);
    }
  });

  it('groups present clades by family in legend order, omitting empty families', () => {
    const groups = groupCladesByFamily([4, 22, 13]);
    // forest comes before built before... no, family order: forest, then built is last, marine before built.
    expect(groups.map((g) => g.family.key)).toEqual(['forest', 'marine', 'built']);
    expect(groups[0].clades.map((c) => c.id)).toEqual([4]);
    expect(groups[1].clades.map((c) => c.id)).toEqual([13]);
    expect(groups[2].clades.map((c) => c.id)).toEqual([22]);
  });

  it('sorts clades within a family by id and dedupes', () => {
    const groups = groupCladesByFamily([14, 2, 13, 2]);
    expect(groups).toHaveLength(1);
    expect(groups[0].family.key).toBe('marine');
    expect(groups[0].clades.map((c) => c.id)).toEqual([2, 13, 14]);
  });

  it('ignores invalid / out-of-range ids and returns [] when none valid', () => {
    expect(groupCladesByFamily([0, 26, -1])).toEqual([]);
    const groups = groupCladesByFamily([0, 99, 4]);
    expect(groups).toHaveLength(1);
    expect(groups[0].clades.map((c) => c.id)).toEqual([4]);
  });

  it('returns null for missing / out-of-range ids', () => {
    expect(cladeName(null)).toBeNull();
    expect(cladeName(0)).toBeNull();
    expect(cladeName(26)).toBeNull();
    expect(cladeRgb(null)).toBeNull();
    expect(cladeRgb(99)).toBeNull();
    expect(cladeFamily(null)).toBeNull();
    expect(cladeMeta(0)).toBeNull();
    expect(cladeMeta(7)?.id).toBe(7);
  });
});
