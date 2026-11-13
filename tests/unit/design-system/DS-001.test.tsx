import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const colorPath = resolve(__dirname, '../../../src/styles/tokens/color.css');
const vizPath = resolve(__dirname, '../../../src/styles/tokens/viz.css');
const colorCss = readFileSync(colorPath, 'utf8');
const vizCss = readFileSync(vizPath, 'utf8');

/** Extract the content of a CSS rule block by selector. */
function extractBlock(css: string, selector: string): string {
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

const OKLCH_RE = /^oklch\(\s*[\d.]+%?\s+[\d.]+\s+[\d.]+(?:\s*\/\s*[\d.]+)?\s*\)$/;

function isValidColor(val: string): boolean {
  return OKLCH_RE.test(val);
}

const darkBlock = extractBlock(colorCss, "[data-theme='dark']");
const lightBlock = extractBlock(colorCss, "[data-theme='light']");
const vizBlock = extractBlock(vizCss, ':root');
const darkTokens = parseTokens(darkBlock);
const lightTokens = parseTokens(lightBlock);
const vizTokens = parseTokens(vizBlock);

const SEMANTIC_COLOR_TOKENS = [
  '--color-surface',
  '--color-surface-raised',
  '--color-surface-overlay',
  '--color-text',
  '--color-text-secondary',
  '--color-text-tertiary',
  '--color-accent',
  '--color-accent-hover',
  '--color-accent-warm',
  '--color-accent-warm-hover',
  '--color-border',
  '--color-border-strong',
  '--color-status-success',
  '--color-status-warning',
  '--color-status-error',
  '--color-focus-ring',
];

describe('DS-001: Color System', () => {
  describe('dark theme', () => {
    it('defines all semantic color tokens', () => {
      for (const token of SEMANTIC_COLOR_TOKENS) {
        expect(darkTokens.has(token), `missing dark token: ${token}`).toBe(true);
      }
    });

    it('all semantic tokens have valid color values', () => {
      for (const token of SEMANTIC_COLOR_TOKENS) {
        const val = darkTokens.get(token)!;
        expect(
          isValidColor(val),
          `dark ${token}: "${val}" is not a valid color`,
        ).toBe(true);
      }
    });
  });

  describe('light theme', () => {
    it('defines all semantic color tokens', () => {
      for (const token of SEMANTIC_COLOR_TOKENS) {
        expect(lightTokens.has(token), `missing light token: ${token}`).toBe(true);
      }
    });

    it('all semantic tokens have valid color values', () => {
      for (const token of SEMANTIC_COLOR_TOKENS) {
        const val = lightTokens.get(token)!;
        expect(
          isValidColor(val),
          `light ${token}: "${val}" is not a valid color`,
        ).toBe(true);
      }
    });
  });

  describe('dark/light parity', () => {
    it('both themes define the exact same set of semantic tokens', () => {
      const darkKeys = [...darkTokens.keys()].sort();
      const lightKeys = [...lightTokens.keys()].sort();
      expect(darkKeys).toEqual(lightKeys);
    });

    it('dark and light values differ for key tokens', () => {
      for (const token of ['--color-surface', '--color-text', '--color-accent']) {
        expect(
          darkTokens.get(token),
          `${token} should differ between themes`,
        ).not.toBe(lightTokens.get(token));
      }
    });
  });

  describe('data visualization palette', () => {
    it('defines 8 viz colors on :root', () => {
      for (let i = 1; i <= 8; i++) {
        expect(vizTokens.has(`--color-viz-${i}`), `missing --color-viz-${i}`).toBe(true);
      }
    });

    it('all viz colors are valid OKLCH colors', () => {
      for (let i = 1; i <= 8; i++) {
        const val = vizTokens.get(`--color-viz-${i}`)!;
        expect(isValidColor(val), `--color-viz-${i}: "${val}" is not valid OKLCH`).toBe(true);
      }
    });

    it('all 8 viz colors are unique', () => {
      const colors = [];
      for (let i = 1; i <= 8; i++) {
        colors.push(vizTokens.get(`--color-viz-${i}`)!);
      }
      expect(new Set(colors).size).toBe(8);
    });
  });

  describe('diverging palette', () => {
    it('defines negative, neutral, and positive diverging colors', () => {
      for (const key of ['negative', 'neutral', 'positive']) {
        const token = `--color-diverge-${key}`;
        expect(vizTokens.has(token), `missing ${token}`).toBe(true);
        expect(
          isValidColor(vizTokens.get(token)!),
          `${token} is not a valid OKLCH color`,
        ).toBe(true);
      }
    });

    it('all three diverging colors are distinct', () => {
      const vals = ['negative', 'neutral', 'positive'].map(
        (k) => vizTokens.get(`--color-diverge-${k}`)!,
      );
      expect(new Set(vals).size).toBe(3);
    });
  });
});
