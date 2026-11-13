import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const vizPath = resolve(__dirname, '../../../src/styles/tokens/viz.css');
const css = readFileSync(vizPath, 'utf8');

function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(`--${name}`, value.trim());
  }
  return tokens;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/;

function parseOKLCH(val: string) {
  const m = val.match(OKLCH_RE);
  if (!m) return null;
  return { l: parseFloat(m[1]), c: parseFloat(m[2]), h: parseFloat(m[3]) };
}

const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
const rootTokens = parseTokens(rootMatch?.[1] ?? '');

describe('DS2-004: Brand-keyed viz palette', () => {
  describe('categorical palette', () => {
    it('defines 8 viz colors', () => {
      for (let i = 1; i <= 8; i++) {
        expect(rootTokens.has(`--color-viz-${i}`), `missing --color-viz-${i}`).toBe(true);
      }
    });

    it('all viz colors parse as OKLCH', () => {
      for (let i = 1; i <= 8; i++) {
        const val = rootTokens.get(`--color-viz-${i}`)!;
        expect(parseOKLCH(val), `--color-viz-${i}: "${val}" not OKLCH`).not.toBeNull();
      }
    });

    it('viz-1 is teal-anchored at hue 180', () => {
      const { h } = parseOKLCH(rootTokens.get('--color-viz-1')!)!;
      expect(h).toBe(180);
    });

    it('viz-2 is coral-anchored at hue 30', () => {
      const { h } = parseOKLCH(rootTokens.get('--color-viz-2')!)!;
      expect(h).toBe(30);
    });

    it('all 8 viz colors are distinct', () => {
      const vals = [];
      for (let i = 1; i <= 8; i++) vals.push(rootTokens.get(`--color-viz-${i}`)!);
      expect(new Set(vals).size).toBe(8);
    });
  });

  describe('diverging palette', () => {
    it('defines negative, neutral, positive', () => {
      for (const k of ['negative', 'neutral', 'positive']) {
        expect(rootTokens.has(`--color-diverge-${k}`), `missing --color-diverge-${k}`).toBe(true);
      }
    });

    it('diverging endpoints use brand hues (teal↔coral)', () => {
      const neg = parseOKLCH(rootTokens.get('--color-diverge-negative')!)!;
      const pos = parseOKLCH(rootTokens.get('--color-diverge-positive')!)!;
      expect(neg.h).toBe(180);
      expect(pos.h).toBe(30);
    });
  });

  describe('sequential palette', () => {
    it('defines 5 sequential stops', () => {
      for (let i = 1; i <= 5; i++) {
        expect(rootTokens.has(`--color-seq-${i}`), `missing --color-seq-${i}`).toBe(true);
      }
    });

    it('sequential is teal monochrome (all at hue 180)', () => {
      for (let i = 1; i <= 5; i++) {
        const { h } = parseOKLCH(rootTokens.get(`--color-seq-${i}`)!)!;
        expect(h, `--color-seq-${i} hue`).toBe(180);
      }
    });

    it('sequential lightness decreases monotonically (1 is lightest)', () => {
      const lightnesses = [];
      for (let i = 1; i <= 5; i++) {
        lightnesses.push(parseOKLCH(rootTokens.get(`--color-seq-${i}`)!)!.l);
      }
      for (let i = 1; i < lightnesses.length; i++) {
        expect(lightnesses[i], `seq-${i + 1} lightness should be < seq-${i}`).toBeLessThan(lightnesses[i - 1]);
      }
    });
  });
});
