import { describe, it, expect } from 'vitest';
import { buildCoastalLayerGroups } from '@/features/coastal/layers/CoastalLayerGroups';

describe('REQ-CO-012: CoastalLayerGroups', () => {
  it('returns an array for any site input', () => {
    expect(Array.isArray(buildCoastalLayerGroups(null))).toBe(true);
    expect(Array.isArray(buildCoastalLayerGroups('placencia'))).toBe(true);
    expect(Array.isArray(buildCoastalLayerGroups('caye-caulker'))).toBe(true);
    expect(Array.isArray(buildCoastalLayerGroups('laughing-bird'))).toBe(true);
  });

  it('contains Placencia lo-res and hi-res groups for placencia site', () => {
    const groups = buildCoastalLayerGroups('placencia');
    const ids = groups.map((g) => g.id);
    expect(ids).toContain('coastal-placencia-lores');
    expect(ids).toContain('coastal-placencia-hires');
  });

  it('Placencia lo-res group includes expected layer IDs', () => {
    const groups = buildCoastalLayerGroups('placencia');
    const lores = groups.find((g) => g.id === 'coastal-placencia-lores');
    expect(lores).toBeDefined();
    expect(lores!.layerIds).toContain('placencia-coast-polygons');
    expect(lores!.layerIds).toContain('coastal-placencia-lowres-poly-attributes');
  });

  it('Placencia hi-res group includes expected layer IDs', () => {
    const groups = buildCoastalLayerGroups('placencia');
    const hires = groups.find((g) => g.id === 'coastal-placencia-hires');
    expect(hires).toBeDefined();
    expect(hires!.layerIds).toContain('placencia-30polygons-shape');
    expect(hires!.layerIds).toContain('coastal-placencia-hires-pl-erosion');
  });

  it('contains a Caye Caulker group for caye-caulker site', () => {
    const groups = buildCoastalLayerGroups('caye-caulker');
    const ids = groups.map((g) => g.id);
    expect(ids).toContain('coastal-cayecaulker');
  });

  it('Caye Caulker group includes NbS and clade layer IDs', () => {
    const groups = buildCoastalLayerGroups('caye-caulker');
    const cc = groups.find((g) => g.id === 'coastal-cayecaulker');
    expect(cc).toBeDefined();
    expect(cc!.layerIds).toContain('cayecaulker-coast-nbs-scores');
    expect(cc!.layerIds).toContain('cayecaulker-coast-ebin-clade-detail');
  });

  it('returns empty array for Laughing Bird Caye (no coastal data)', () => {
    const groups = buildCoastalLayerGroups('laughing-bird');
    expect(groups).toHaveLength(0);
  });

  it('each group has required fields: id, label, layerIds, order', () => {
    const groups = buildCoastalLayerGroups('placencia');
    for (const group of groups) {
      expect(typeof group.id).toBe('string');
      expect(typeof group.label).toBe('string');
      expect(Array.isArray(group.layerIds)).toBe(true);
      expect(typeof group.order).toBe('number');
    }
  });
});
