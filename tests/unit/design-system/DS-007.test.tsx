import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const motionPath = resolve(__dirname, '../../../src/styles/tokens/motion.css');
const css = readFileSync(motionPath, 'utf8');

/** Extract the content of a CSS rule block by selector. */
function extractBlock(selector: string): string {
  const escaped = selector.replace(/[[\]']/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`));
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

const MS_RE = /^\d+ms$/;
const CUBIC_BEZIER_RE = /^cubic-bezier\(\s*[\d.]+/;

describe('DS-007: Animation and Transitions', () => {
  describe('duration tokens', () => {
    const DURATIONS = ['--duration-fast', '--duration-normal', '--duration-slow'] as const;

    it('defines fast, normal, and slow duration tokens', () => {
      for (const token of DURATIONS) {
        expect(rootTokens.has(token), `missing ${token}`).toBe(true);
      }
    });

    it('all durations are valid ms values', () => {
      for (const token of DURATIONS) {
        const val = rootTokens.get(token)!;
        expect(MS_RE.test(val), `${token}: "${val}" is not a valid ms value`).toBe(true);
      }
    });

    it('durations increase: fast < normal < slow', () => {
      const [fast, normal, slow] = DURATIONS.map((t) =>
        parseInt(rootTokens.get(t)!, 10),
      );
      expect(normal).toBeGreaterThan(fast);
      expect(slow).toBeGreaterThan(normal);
    });

    it('no duration exceeds 500ms', () => {
      for (const token of DURATIONS) {
        const val = parseInt(rootTokens.get(token)!, 10);
        expect(val, `${token}: ${val}ms exceeds 500ms`).toBeLessThanOrEqual(500);
      }
    });
  });

  describe('easing tokens', () => {
    it('defines ease-out and ease-in-out tokens', () => {
      expect(rootTokens.has('--ease-out')).toBe(true);
      expect(rootTokens.has('--ease-in-out')).toBe(true);
    });

    it('easing values are cubic-bezier functions', () => {
      for (const token of ['--ease-out', '--ease-in-out']) {
        const val = rootTokens.get(token)!;
        expect(
          CUBIC_BEZIER_RE.test(val),
          `${token}: "${val}" is not a cubic-bezier function`,
        ).toBe(true);
      }
    });
  });

  describe('composite transition tokens', () => {
    it('defines hover, panel, and fade transition shorthands', () => {
      for (const name of ['--transition-hover', '--transition-panel', '--transition-fade']) {
        expect(rootTokens.has(name), `missing ${name}`).toBe(true);
      }
    });

    it('transition shorthands reference duration and easing vars', () => {
      for (const name of ['--transition-hover', '--transition-panel', '--transition-fade']) {
        const val = rootTokens.get(name)!;
        expect(val, `${name} should reference var(--duration-*)`).toContain('var(--duration-');
        expect(val, `${name} should reference var(--ease-`).toContain('var(--ease-');
      }
    });
  });

  describe('reduced motion', () => {
    it('contains a prefers-reduced-motion media query', () => {
      expect(css).toContain('prefers-reduced-motion: reduce');
    });

    it('reduced motion block zeroes out all durations', () => {
      const reducedMatch = css.match(
        /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{([^}]*\{[^}]*\}[^}]*)\}/,
      );
      expect(reducedMatch, 'missing @media (prefers-reduced-motion) block').not.toBeNull();
      const inner = reducedMatch![1];
      for (const token of ['--duration-fast', '--duration-normal', '--duration-slow']) {
        expect(inner, `reduced motion should zero ${token}`).toMatch(
          new RegExp(`${token}\\s*:\\s*0ms`),
        );
      }
    });
  });
});
