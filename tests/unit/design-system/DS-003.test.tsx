import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const spacePath = resolve(__dirname, '../../../src/styles/tokens/space.css');
const css = readFileSync(spacePath, 'utf8');

/** Parse --custom-property: value pairs across all :root blocks in a CSS string. */
function parseRootTokens(source: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const m of source.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const [, name, value] of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(`--${name}`, value.trim());
    }
  }
  return tokens;
}

const rootTokens = parseRootTokens(css);

const PX_RE = /^\d+(\.\d+)?px$/;
const VW_RE = /^\d+(\.\d+)?vw$/;

function parsePx(val: string): number {
  return parseFloat(val.replace('px', ''));
}

describe('DS-003: Spacing and Layout', () => {
  describe('spacing scale', () => {
    const EXPECTED_SPACES: Record<string, number> = {
      '1': 4,
      '2': 8,
      '3': 12,
      '4': 16,
      '6': 24,
      '8': 32,
      '12': 48,
      '16': 64,
    };

    it('defines all 8 spacing tokens', () => {
      for (const key of Object.keys(EXPECTED_SPACES)) {
        expect(rootTokens.has(`--space-${key}`), `missing --space-${key}`).toBe(true);
      }
    });

    it('all spacing values are valid px values', () => {
      for (const key of Object.keys(EXPECTED_SPACES)) {
        const val = rootTokens.get(`--space-${key}`)!;
        expect(PX_RE.test(val), `--space-${key}: "${val}" is not a valid px value`).toBe(true);
      }
    });

    it('spacing values follow 4px base unit (multiples of 4)', () => {
      for (const [key, expected] of Object.entries(EXPECTED_SPACES)) {
        const val = parsePx(rootTokens.get(`--space-${key}`)!);
        expect(val % 4, `--space-${key}: ${val}px is not a multiple of 4`).toBe(0);
        expect(val).toBe(expected);
      }
    });

    it('spacing tokens increase monotonically', () => {
      const keys = Object.keys(EXPECTED_SPACES);
      const values = keys.map((k) => parsePx(rootTokens.get(`--space-${k}`)!));
      for (let i = 1; i < values.length; i++) {
        expect(values[i], `--space-${keys[i]} should be > --space-${keys[i - 1]}`).toBeGreaterThan(
          values[i - 1],
        );
      }
    });
  });

  describe('responsive breakpoints', () => {
    const BREAKPOINTS = ['mobile', 'tablet', 'desktop'] as const;

    it('defines mobile, tablet, and desktop breakpoints', () => {
      for (const bp of BREAKPOINTS) {
        expect(rootTokens.has(`--breakpoint-${bp}`), `missing --breakpoint-${bp}`).toBe(true);
      }
    });

    it('breakpoint values are valid px values', () => {
      for (const bp of BREAKPOINTS) {
        const val = rootTokens.get(`--breakpoint-${bp}`)!;
        expect(PX_RE.test(val), `--breakpoint-${bp}: "${val}" is not valid px`).toBe(true);
      }
    });

    it('breakpoints increase: mobile < tablet < desktop', () => {
      const [mobile, tablet, desktop] = BREAKPOINTS.map((bp) =>
        parsePx(rootTokens.get(`--breakpoint-${bp}`)!),
      );
      expect(tablet).toBeGreaterThan(mobile);
      expect(desktop).toBeGreaterThan(tablet);
    });
  });

  describe('panel and content dimensions', () => {
    it('defines panel width tokens', () => {
      expect(rootTokens.has('--panel-width-min')).toBe(true);
      expect(rootTokens.has('--panel-width-default')).toBe(true);
      expect(rootTokens.has('--panel-width-max')).toBe(true);
    });

    it('panel-width-min and panel-width-default are px values', () => {
      expect(PX_RE.test(rootTokens.get('--panel-width-min')!)).toBe(true);
      expect(PX_RE.test(rootTokens.get('--panel-width-default')!)).toBe(true);
    });

    it('panel-width-max is a viewport-relative value', () => {
      expect(VW_RE.test(rootTokens.get('--panel-width-max')!)).toBe(true);
    });

    it('panel min < default', () => {
      const min = parsePx(rootTokens.get('--panel-width-min')!);
      const def = parsePx(rootTokens.get('--panel-width-default')!);
      expect(def).toBeGreaterThan(min);
    });

    it('defines content max width', () => {
      expect(rootTokens.has('--content-max-width')).toBe(true);
      expect(PX_RE.test(rootTokens.get('--content-max-width')!)).toBe(true);
    });

    it('defines nav height', () => {
      expect(rootTokens.has('--nav-height')).toBe(true);
      expect(PX_RE.test(rootTokens.get('--nav-height')!)).toBe(true);
    });
  });
});
