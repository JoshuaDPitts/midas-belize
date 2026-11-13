import { describe, it, expect } from 'vitest';
import {
  sumTonnesByPolygon,
  deltaPerPolygon,
  type ErosionMonthlyRow,
} from '@/lib/data/hooks/useScenarioImpact';

describe('REQ-WS-033: useScenarioImpact aggregators', () => {
  describe('sumTonnesByPolygon', () => {
    it('groups rows by MIMES_ID and sums "T per month"', () => {
      const rows: ErosionMonthlyRow[] = [
        { MIMES_ID: 1, 'T per month': 10 },
        { MIMES_ID: 1, 'T per month': 5 },
        { MIMES_ID: 2, 'T per month': 30 },
      ];
      const m = sumTonnesByPolygon(rows);
      expect(m.get('1')).toBe(15);
      expect(m.get('2')).toBe(30);
    });

    it('accepts T_per_month and T column aliases', () => {
      const rows: ErosionMonthlyRow[] = [
        { MIMES_ID: 1, T_per_month: 7 },
        { MIMES_ID: 1, T: 3 },
      ];
      expect(sumTonnesByPolygon(rows).get('1')).toBe(10);
    });

    it('falls through MIMES_ID → Name → WATERSHED for the polygon key', () => {
      const rows: ErosionMonthlyRow[] = [
        { Name: 'Big Creek', 'T per month': 12 },
        { WATERSHED: 'Belize', 'T per month': 8 },
      ];
      const m = sumTonnesByPolygon(rows);
      expect(m.get('Big Creek')).toBe(12);
      expect(m.get('Belize')).toBe(8);
    });

    it('normalises float-string ids ("17.0" → "17") so joins still match', () => {
      const rows: ErosionMonthlyRow[] = [
        { MIMES_ID: '17.0', 'T per month': 5 },
        { MIMES_ID: 17, 'T per month': 5 },
      ];
      expect(sumTonnesByPolygon(rows).get('17')).toBe(10);
    });

    it('returns empty map for empty / nullish input', () => {
      expect(sumTonnesByPolygon([]).size).toBe(0);
      expect(sumTonnesByPolygon(null).size).toBe(0);
      expect(sumTonnesByPolygon(undefined).size).toBe(0);
    });

    it('drops rows with no polygon key (defensive)', () => {
      const rows = [{ 'T per month': 999 }] as ErosionMonthlyRow[];
      expect(sumTonnesByPolygon(rows).size).toBe(0);
    });
  });

  describe('deltaPerPolygon', () => {
    it('returns scenario - base for shared keys', () => {
      const base = new Map([['1', 100], ['2', 50]]);
      const scen = new Map([['1', 60], ['2', 80]]);
      const d = deltaPerPolygon(base, scen);
      expect(d.get('1')).toBe(-40);
      expect(d.get('2')).toBe(30);
    });

    it('treats missing keys as 0 so unique polygons still surface', () => {
      const base = new Map([['1', 100]]);
      const scen = new Map([['2', 20]]);
      const d = deltaPerPolygon(base, scen);
      expect(d.get('1')).toBe(-100); // base only
      expect(d.get('2')).toBe(20); //   scenario only
    });

    it('returns empty map when both inputs are empty', () => {
      expect(deltaPerPolygon(new Map(), new Map()).size).toBe(0);
    });
  });
});
