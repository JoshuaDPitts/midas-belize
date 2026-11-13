import { describe, it, expect } from 'vitest';
import { coastalManifest } from '@/features/coastal';
import { FEATURES } from '@/features';

describe('REQ-CO-001: Coastal FeatureManifest', () => {
  it('exports a manifest with id "coastal"', () => {
    expect(coastalManifest.id).toBe('coastal');
  });
  it('has label "Coastal & Wave Attenuation"', () => {
    expect(coastalManifest.label).toBe('Coastal & Wave Attenuation');
  });
  it('contributes domainContent with sublabel "Coastal"', () => {
    expect(coastalManifest.domainContent?.sublabel).toBe('Coastal');
  });
  it('registers inspectFormatters for coast-polygons and 30-poly', () => {
    expect(coastalManifest.inspectFormatters).toHaveProperty('coast-polygons');
    expect(coastalManifest.inspectFormatters).toHaveProperty('placencia-30polygons-shape');
  });
  it('registers 4 mapOverlays', () => {
    expect(coastalManifest.mapOverlays).toHaveLength(4);
  });
  it('is registered in the FEATURES aggregator', () => {
    expect(FEATURES.map((m) => m.id)).toContain('coastal');
  });
});
