import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/data', () => ({
  useLayersForSite: vi.fn(() => ({ layers: [], loading: false, error: null })),
}));

import { parseDatasetId, classifyAvailability, EXPECTED_VARIABLES } from '@/features/scenarios/data/useScenarioAvailability';

describe('REQ-SC-004: useScenarioAvailability', () => {
  it('parseDatasetId extracts domain/scenario/variable', () => {
    const r = parseDatasetId('output-coast-placencia-hires-wave-G');
    expect(r).toEqual({ domain: 'coastal', site: 'placencia', resolution: 'hires', variable: 'wave', scenarioCode: 'G' });
  });
  it('parseDatasetId normalizes bc to basecase', () => {
    const r = parseDatasetId('output-marine-wave-attenuation-bc');
    expect(r?.scenarioCode).toBe('basecase');
  });
  it('parseDatasetId tolerates malformed input', () => {
    expect(parseDatasetId('placencia-coast-polygons')).toBeNull();
    expect(parseDatasetId('output-nope')).toBeNull();
  });
  it('classifyAvailability returns missing when no datasets', () => {
    expect(classifyAvailability([], 'coastal')).toBe('missing');
  });
  it('classifyAvailability returns published when all expected variables present', () => {
    const got = classifyAvailability(EXPECTED_VARIABLES.coastal, 'coastal');
    expect(got).toBe('published');
  });
  it('classifyAvailability returns partial when some variables missing', () => {
    const partial = EXPECTED_VARIABLES.coastal.slice(0, 1);
    expect(classifyAvailability(partial, 'coastal')).toBe('partial');
  });
});
