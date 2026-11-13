// tests/unit/map-engine/REQ-ME-013.test.ts
// ME-013 — export format serializers + filename builder.
import { describe, it, expect } from 'vitest';
import {
  csvEscape,
  featuresToCsv,
  featuresToGeoJson,
  buildFilename,
  LayerNotExportableError,
} from '@/lib/map/export/exportFormats';
import type { Feature } from 'geojson';

const mkFeature = (id: number, props: Record<string, unknown>): Feature => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [0, 0] },
  properties: { id, ...props },
});

describe('REQ-ME-013: csvEscape (RFC 4180)', () => {
  it('passes through plain strings unchanged', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('emits numbers and booleans without quoting', () => {
    expect(csvEscape(42)).toBe('42');
    expect(csvEscape(3.14)).toBe('3.14');
    expect(csvEscape(true)).toBe('true');
  });

  it('quotes strings containing commas', () => {
    expect(csvEscape('Corozal, Belize')).toBe('"Corozal, Belize"');
  });

  it('quotes strings containing newlines', () => {
    expect(csvEscape('a\nb')).toBe('"a\nb"');
  });

  it('doubles embedded quotes and wraps in quotes', () => {
    expect(csvEscape('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('null/undefined become empty fields', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('serializes objects/arrays via JSON.stringify with quoting', () => {
    expect(csvEscape({ a: 1 })).toBe('"{""a"":1}"');
    expect(csvEscape([1, 2])).toBe('"[1,2]"');
  });
});

describe('REQ-ME-013: featuresToCsv', () => {
  it('emits header + one row per feature using union of property keys', () => {
    const rows = featuresToCsv([
      mkFeature(1, { name: 'A', pop: 100 }),
      mkFeature(2, { name: 'B', pop: 200, flag: 'X' }),
    ]);
    const lines = rows.split('\r\n');
    expect(lines[0]).toBe('id,name,pop,flag');
    expect(lines[1]).toBe('1,A,100,');
    expect(lines[2]).toBe('2,B,200,X');
  });

  it('quotes field values with delimiters', () => {
    const rows = featuresToCsv([mkFeature(1, { desc: 'Caye, reef' })]);
    expect(rows).toContain('"Caye, reef"');
  });

  it('returns empty string for empty feature list', () => {
    expect(featuresToCsv([])).toBe('');
  });

  it('uses CRLF line endings per RFC 4180', () => {
    const rows = featuresToCsv([mkFeature(1, {}), mkFeature(2, {})]);
    expect(rows).toContain('\r\n');
    expect(rows.split('\r\n').length).toBe(3); // header + 2 rows
  });
});

describe('REQ-ME-013: featuresToGeoJson', () => {
  it('wraps features in a valid FeatureCollection', () => {
    const fc = featuresToGeoJson([mkFeature(1, { n: 'a' }), mkFeature(2, { n: 'b' })]);
    expect(fc.type).toBe('FeatureCollection');
    expect(fc.features).toHaveLength(2);
    expect(fc.features[0].type).toBe('Feature');
    expect(fc.features[0].properties).toEqual({ id: 1, n: 'a' });
  });

  it('normalizes features missing a properties field to an empty object', () => {
    const weird = { type: 'Feature' as const, geometry: { type: 'Point' as const, coordinates: [0, 0] }, properties: null };
    const fc = featuresToGeoJson([weird]);
    expect(fc.features[0].properties).toEqual({});
  });
});

describe('REQ-ME-013: buildFilename', () => {
  it('includes site + layer + date when all provided', () => {
    const name = buildFilename({
      site: 'laughing-bird',
      layerId: 'me013-districts',
      extension: 'csv',
      date: new Date('2026-04-20T12:00:00Z'),
    });
    expect(name).toBe('midas-belize-laughing-bird-me013-districts-2026-04-20.csv');
  });

  it('omits site when null', () => {
    const name = buildFilename({
      site: null,
      layerId: 'x',
      extension: 'geojson',
      date: new Date('2026-04-20T12:00:00Z'),
    });
    expect(name).toBe('midas-belize-x-2026-04-20.geojson');
  });

  it('omits layerId for PNG exports (viewport-level)', () => {
    const name = buildFilename({
      extension: 'png',
      date: new Date('2026-04-20T12:00:00Z'),
    });
    expect(name).toBe('midas-belize-2026-04-20.png');
  });

  it('zero-pads month and day', () => {
    const name = buildFilename({
      extension: 'png',
      date: new Date('2026-01-05T12:00:00Z'),
    });
    expect(name).toContain('2026-01-05');
  });
});

describe('REQ-ME-013: LayerNotExportableError', () => {
  it('is an Error subclass with a typed name', () => {
    const err = new LayerNotExportableError('x', 'reason');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('LayerNotExportableError');
    expect(err.message).toContain('x');
    expect(err.message).toContain('reason');
  });
});
