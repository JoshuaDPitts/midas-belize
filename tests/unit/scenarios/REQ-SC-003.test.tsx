import { describe, it, expect } from 'vitest';
import { scenariosManifest } from '@/features/scenarios';
import { FEATURES } from '@/features';

describe('REQ-SC-003: Scenarios FeatureManifest', () => {
  it('exports a manifest with id "scenarios"', () => {
    expect(scenariosManifest.id).toBe('scenarios');
  });
  it('has label "Scenarios"', () => {
    expect(scenariosManifest.label).toBe('Scenarios');
  });
  it('contributes scenariosContent', () => {
    expect(scenariosManifest.scenariosContent).toBeDefined();
  });
  it('does not contribute domainContent or mapOverlays', () => {
    expect(scenariosManifest.domainContent).toBeUndefined();
    expect(scenariosManifest.mapOverlays).toBeUndefined();
  });
  it('is registered in the FEATURES aggregator', () => {
    expect(FEATURES.map((m) => m.id)).toContain('scenarios');
  });
});
