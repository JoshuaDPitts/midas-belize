import { describe, it, expect } from 'vitest';
import {
  siteParser,
  scenarioParser,
  tParser,
  layersParser,
  viewportParser,
} from '@/atoms/url-parsers';

describe('REQ-SM-007 — URL parsers (round-trips)', () => {
  it('siteParser accepts the 3 valid SiteIds + null', () => {
    expect(siteParser.parse('placencia')).toBe('placencia');
    expect(siteParser.parse('caye-caulker')).toBe('caye-caulker');
    expect(siteParser.parse('laughing-bird')).toBe('laughing-bird');
    expect(siteParser.parse('mars')).toBe(null);
    // Regression guard: the old `'laughing-bird-caye'` literal (pre-drift-fix)
    // must not parse — it was reconciled to the data-layer canonical.
    expect(siteParser.parse('laughing-bird-caye')).toBe(null);
  });

  it('scenarioParser validates ScenarioId and rejects invalid input', () => {
    expect(scenarioParser.parse('basecase')).toBe('basecase');
    expect(scenarioParser.parse('G')).toBe('G');
    expect(scenarioParser.parse('baseline')).toBe(null);  // invalid ID
    expect(scenarioParser.parse('')).toBe(null);
    expect(scenarioParser.parse('invalid')).toBe(null);
  });

  it('tParser falls back to the documented default', () => {
    expect(tParser.parse(null)).toBe('2026-01');
    expect(tParser.parse('2026-04')).toBe('2026-04');
  });

  it('layersParser splits on commas + serializes back identically', () => {
    expect(layersParser.parse('marine-coral,erosion-risk')).toEqual([
      'marine-coral',
      'erosion-risk',
    ]);
    expect(layersParser.serialize(['marine-coral', 'erosion-risk'])).toBe(
      'marine-coral,erosion-risk',
    );
    expect(layersParser.parse(null)).toEqual([]);
  });

  it('viewportParser round-trips lng,lat,zoom,bearing,pitch with 4dp precision on lng/lat', () => {
    const v = viewportParser.parse('-88.36,16.55,11,30,45');
    expect(v).toEqual({
      center: [-88.36, 16.55],
      zoom: 11,
      bearing: 30,
      pitch: 45,
    });
    const round = viewportParser.serialize({
      center: [-88.36123, 16.5599],
      zoom: 11,
      bearing: 30,
      pitch: 45,
    });
    expect(round).toBe('-88.3612,16.5599,11,30,45');
  });

  it('viewportParser returns null on malformed input', () => {
    expect(viewportParser.parse('garbage')).toBeNull();
    expect(viewportParser.parse('-88,16')).toBeNull();
  });
});
