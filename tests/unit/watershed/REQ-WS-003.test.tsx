import { describe, it, expect } from 'vitest';
import { watershedManifest } from '@/features/watershed/manifest';

describe('REQ-WS-003: Layers tab grouping per site', () => {
  it('contributes a layersRowGroup function', () => {
    expect(typeof watershedManifest.layersRowGroup).toBe('function');
  });

  it('returns placencia groups for placencia site', () => {
    const groups = watershedManifest.layersRowGroup?.('placencia') ?? [];
    expect(groups.map((g) => g.id)).toContain('watershed-placencia');
  });

  it('returns caye-caulker groups for caye-caulker site', () => {
    const groups = watershedManifest.layersRowGroup?.('caye-caulker') ?? [];
    expect(groups.map((g) => g.id)).toContain('watershed-cayecaulker');
  });

  it('returns no groups for laughing-bird (offshore)', () => {
    expect(watershedManifest.layersRowGroup?.('laughing-bird')).toEqual([]);
  });

  it('returns national groups when site is null', () => {
    const groups = watershedManifest.layersRowGroup?.(null) ?? [];
    const ids = groups.map((g) => g.id);
    expect(ids).toContain('watershed-national');
    expect(ids).toContain('rfactor-national');
  });

  it('national rfactor group lists 12 monthly layer ids', () => {
    const groups = watershedManifest.layersRowGroup?.(null) ?? [];
    const rfactor = groups.find((g) => g.id === 'rfactor-national');
    expect(rfactor?.layerIds).toHaveLength(12);
    expect(rfactor?.layerIds[0]).toBe('rfactor-jan');
    expect(rfactor?.layerIds[11]).toBe('rfactor-dec');
  });
});
