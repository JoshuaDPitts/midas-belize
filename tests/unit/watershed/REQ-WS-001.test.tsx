import { describe, it, expect } from 'vitest';
import { watershedManifest } from '@/features/watershed/manifest';
import { FEATURES } from '@/features/index';

describe('REQ-WS-001: Watershed manifest registration', () => {
  it('exports a manifest with id "watershed"', () => {
    expect(watershedManifest.id).toBe('watershed');
    expect(watershedManifest.label).toBe('Watershed & Erosion');
  });

  it('contributes domainContent with Watershed sublabel', () => {
    expect(watershedManifest.domainContent?.sublabel).toBe('Watershed');
    expect(watershedManifest.domainContent?.component).toBeDefined();
  });

  it('contributes inspect formatters for watershed-polygons + watersheds-utm-shape', () => {
    expect(watershedManifest.inspectFormatters?.['watershed-polygons']).toBeDefined();
    expect(watershedManifest.inspectFormatters?.['watersheds-utm-shape']).toBeDefined();
  });

  it('contributes a non-empty mapOverlays array', () => {
    expect(Array.isArray(watershedManifest.mapOverlays)).toBe(true);
    expect(watershedManifest.mapOverlays?.length).toBeGreaterThan(0);
  });

  it('is registered in the FEATURES aggregator', () => {
    expect(FEATURES.map((m) => m.id)).toContain('watershed');
  });
});
