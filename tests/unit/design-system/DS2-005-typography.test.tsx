import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const typographyPath = resolve(__dirname, '../../../src/styles/tokens/typography.css');
const css = readFileSync(typographyPath, 'utf8');

const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';

function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(`--${name}`, value.trim());
  }
  return tokens;
}

const tokens = parseTokens(rootBlock);

describe('DS2-005: Split typography scales', () => {
  describe('app scale (dense, 14px base)', () => {
    const STEPS = ['xs', 'sm', 'base', 'lg', 'xl', '2xl'] as const;

    it('defines all 6 app-scale sizes', () => {
      for (const s of STEPS) {
        expect(tokens.has(`--font-size-app-${s}`), `missing --font-size-app-${s}`).toBe(true);
      }
    });

    it('app base is 0.875rem (14px)', () => {
      expect(tokens.get('--font-size-app-base')).toBe('0.875rem');
    });

    it('sizes increase monotonically', () => {
      const vals = STEPS.map((s) => parseFloat(tokens.get(`--font-size-app-${s}`)!));
      for (let i = 1; i < vals.length; i++) {
        expect(vals[i]).toBeGreaterThan(vals[i - 1]);
      }
    });
  });

  describe('content scale (fluid, 16px base)', () => {
    const STEPS = ['sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl'] as const;

    it('defines all content-scale sizes through 6xl', () => {
      for (const s of STEPS) {
        expect(tokens.has(`--font-size-content-${s}`), `missing --font-size-content-${s}`).toBe(true);
      }
    });

    it('content base is 1rem (16px)', () => {
      expect(tokens.get('--font-size-content-base')).toBe('1rem');
    });

    it('display sizes (2xl through 6xl) use clamp()', () => {
      for (const s of ['2xl', '3xl', '4xl', '5xl', '6xl']) {
        const val = tokens.get(`--font-size-content-${s}`)!;
        expect(val, `--font-size-content-${s}`).toMatch(/^clamp\(/);
      }
    });
  });

  describe('line-heights and letter-spacing', () => {
    it('defines display, tight, normal, relaxed line-heights', () => {
      for (const lh of ['display', 'tight', 'normal', 'relaxed']) {
        expect(tokens.has(`--line-height-${lh}`), `missing --line-height-${lh}`).toBe(true);
      }
    });

    it('defines display, tight, normal, caps letter-spacings', () => {
      for (const ls of ['display', 'tight', 'normal', 'caps']) {
        expect(tokens.has(`--letter-spacing-${ls}`), `missing --letter-spacing-${ls}`).toBe(true);
      }
    });

    it('--line-height-display is tightest', () => {
      const display = parseFloat(tokens.get('--line-height-display')!);
      const tight = parseFloat(tokens.get('--line-height-tight')!);
      expect(display).toBeLessThan(tight);
    });
  });

  describe('weight tokens', () => {
    /* Per DEC-012: Funnel Display caps at weight 800 on Google Fonts (no 900). */
    it('defines --font-weight-display at 800 (Funnel Display ExtraBold)', () => {
      expect(tokens.get('--font-weight-display')).toBe('800');
    });
  });
});
