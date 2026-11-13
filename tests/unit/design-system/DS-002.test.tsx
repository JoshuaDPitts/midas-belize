import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const typoPath = resolve(__dirname, '../../../src/styles/tokens/typography.css');
const css = readFileSync(typoPath, 'utf8');

/** Extract the content of a CSS rule block by selector. */
function extractBlock(selector: string): string {
  const escaped = selector.replace(/[[\]']/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
}

/** Parse all --custom-property: value pairs from a CSS block string. */
function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(`--${name}`, value.trim());
  }
  return tokens;
}

const rootTokens = parseTokens(extractBlock(':root'));

const REM_RE = /^\d+(\.\d+)?rem$/;
const CLAMP_RE = /^clamp\(/;
const NUMERIC_RE = /^\d+(\.\d+)?$/;

function isValidSize(val: string): boolean {
  return REM_RE.test(val) || CLAMP_RE.test(val);
}

const EXPECTED_APP = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const;
const EXPECTED_CONTENT = ['sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;

describe('DS-002: Typography', () => {
  describe('app type scale (dense, 14px base)', () => {
    it('defines all 6 app-scale sizes', () => {
      for (const size of EXPECTED_APP) {
        expect(rootTokens.has(`--font-size-app-${size}`), `missing --font-size-app-${size}`).toBe(true);
      }
    });

    it('all app sizes are valid rem values', () => {
      for (const size of EXPECTED_APP) {
        const val = rootTokens.get(`--font-size-app-${size}`)!;
        expect(REM_RE.test(val), `--font-size-app-${size}: "${val}" is not a valid rem value`).toBe(
          true,
        );
      }
    });

    it('app sizes increase monotonically', () => {
      const values = EXPECTED_APP.map((s) => parseFloat(rootTokens.get(`--font-size-app-${s}`)!));
      for (let i = 1; i < values.length; i++) {
        expect(values[i]).toBeGreaterThan(values[i - 1]);
      }
    });
  });

  describe('content type scale (fluid, 16px base)', () => {
    it('defines all 9 content-scale sizes', () => {
      for (const size of EXPECTED_CONTENT) {
        expect(rootTokens.has(`--font-size-content-${size}`), `missing --font-size-content-${size}`).toBe(true);
      }
    });

    it('all content sizes are rem or clamp() values', () => {
      for (const size of EXPECTED_CONTENT) {
        const val = rootTokens.get(`--font-size-content-${size}`)!;
        expect(isValidSize(val), `--font-size-content-${size}: "${val}"`).toBe(true);
      }
    });

    it('content display sizes (2xl+) use clamp()', () => {
      for (const size of ['2xl', '3xl', '4xl', '5xl', '6xl']) {
        const val = rootTokens.get(`--font-size-content-${size}`)!;
        expect(CLAMP_RE.test(val), `--font-size-content-${size} should be clamp()`).toBe(true);
      }
    });
  });

  describe('font families', () => {
    it('defines display, sans-serif, and monospace families', () => {
      expect(rootTokens.has('--font-display')).toBe(true);
      expect(rootTokens.has('--font-sans')).toBe(true);
      expect(rootTokens.has('--font-mono')).toBe(true);
      expect(rootTokens.get('--font-sans')).toContain('sans-serif');
      expect(rootTokens.get('--font-mono')).toContain('monospace');
    });

    it('font families include fallback stacks', () => {
      const display = rootTokens.get('--font-display')!;
      const sans = rootTokens.get('--font-sans')!;
      const mono = rootTokens.get('--font-mono')!;
      expect(display.split(',').length).toBeGreaterThan(1);
      expect(sans.split(',').length).toBeGreaterThan(1);
      expect(mono.split(',').length).toBeGreaterThan(1);
    });
  });

  describe('font weights', () => {
    const EXPECTED_WEIGHTS: Record<string, number> = {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      display: 800,
    };

    it('defines all 5 font weight tokens', () => {
      for (const w of Object.keys(EXPECTED_WEIGHTS)) {
        expect(rootTokens.has(`--font-weight-${w}`), `missing --font-weight-${w}`).toBe(true);
      }
    });

    it('weight values are correct numeric values', () => {
      for (const [name, expected] of Object.entries(EXPECTED_WEIGHTS)) {
        const val = rootTokens.get(`--font-weight-${name}`)!;
        expect(NUMERIC_RE.test(val), `--font-weight-${name}: "${val}" is not numeric`).toBe(true);
        expect(Number(val)).toBe(expected);
      }
    });
  });

  describe('line heights', () => {
    const EXPECTED = ['display', 'tight', 'normal', 'relaxed'] as const;

    it('defines display, tight, normal, relaxed line heights', () => {
      for (const k of EXPECTED) {
        expect(rootTokens.has(`--line-height-${k}`), `missing --line-height-${k}`).toBe(true);
      }
    });

    it('line height values are unitless numbers', () => {
      for (const k of EXPECTED) {
        const val = rootTokens.get(`--line-height-${k}`)!;
        expect(NUMERIC_RE.test(val), `--line-height-${k}: "${val}" should be unitless`).toBe(true);
      }
    });

    it('display < tight < normal < relaxed', () => {
      const v = EXPECTED.map((k) => parseFloat(rootTokens.get(`--line-height-${k}`)!));
      for (let i = 1; i < v.length; i++) {
        expect(v[i]).toBeGreaterThan(v[i - 1]);
      }
    });
  });
});
