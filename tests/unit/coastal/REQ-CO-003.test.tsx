import { describe, it, expect, vi } from 'vitest';

vi.mock('swr', () => ({
  default: vi.fn(() => ({ data: undefined, isLoading: false, error: null })),
}));

import { geometryDatasetForSite, joinedDatasetsForSite } from '@/lib/data/hooks/useCoastalForSite';

describe('REQ-CO-003: useCoastalForSite', () => {
  it('returns placencia-coast-polygons for lores placencia', () => {
    expect(geometryDatasetForSite('placencia', 'lores')).toBe('placencia-coast-polygons');
  });
  it('returns placencia-30polygons-shape for hires placencia', () => {
    expect(geometryDatasetForSite('placencia', 'hires')).toBe('placencia-30polygons-shape');
  });
  it('returns cayecaulker-coast-polygons for any CC resolution', () => {
    expect(geometryDatasetForSite('caye-caulker', 'hires')).toBe('cayecaulker-coast-polygons');
    expect(geometryDatasetForSite('caye-caulker', 'lores')).toBe('cayecaulker-coast-polygons');
  });
  it('returns null for laughing-bird', () => {
    expect(geometryDatasetForSite('laughing-bird', 'hires')).toBeNull();
  });
  it('returns urban-ratio dataset for hires placencia joins', () => {
    const joined = joinedDatasetsForSite('placencia', 'hires');
    expect(joined?.urbanRatio).toBe('coastal-placencia-hires-urban-ratio');
  });
  it('returns null urbanRatio for caye-caulker', () => {
    const joined = joinedDatasetsForSite('caye-caulker', 'hires');
    expect(joined?.urbanRatio).toBeNull();
  });
});
