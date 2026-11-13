import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const colorPath = resolve(__dirname, '../../../src/styles/tokens/color.css');
const css = readFileSync(colorPath, 'utf8');

function extractBlock(selector: string): string {
  const escaped = selector.replace(/[[\]']/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match?.[1] ?? '';
}

function parseTokens(block: string): Map<string, string> {
  const tokens = new Map<string, string>();
  for (const [, name, value] of block.matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(`--${name}`, value.trim());
  }
  return tokens;
}

const OKLCH_RE = /^oklch\(\s*([\d.]+%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+)?\s*\)$/;

function parseOKLCH(val: string): { l: number; c: number; h: number } | null {
  const m = val.match(OKLCH_RE);
  if (!m) return null;
  const l = parseFloat(m[1]);
  const c = parseFloat(m[2]);
  const h = parseFloat(m[3]);
  return { l, c, h };
}

const darkTokens = parseTokens(extractBlock("[data-theme='dark']"));
const lightTokens = parseTokens(extractBlock("[data-theme='light']"));

const SEMANTIC = [
  '--color-surface', '--color-surface-raised', '--color-surface-overlay',
  '--color-text', '--color-text-secondary', '--color-text-tertiary',
  '--color-accent', '--color-accent-hover',
  '--color-accent-warm', '--color-accent-warm-hover',
  '--color-border', '--color-border-strong',
  '--color-status-success', '--color-status-warning', '--color-status-error',
  '--color-focus-ring',
];

describe('DS2-003: OKLCH color migration', () => {
  describe('presence', () => {
    it('dark theme defines all semantic tokens', () => {
      for (const t of SEMANTIC) {
        expect(darkTokens.has(t), `dark missing ${t}`).toBe(true);
      }
    });

    it('light theme defines all semantic tokens', () => {
      for (const t of SEMANTIC) {
        expect(lightTokens.has(t), `light missing ${t}`).toBe(true);
      }
    });
  });

  describe('OKLCH format', () => {
    it('all dark tokens parse as OKLCH', () => {
      for (const t of SEMANTIC) {
        const val = darkTokens.get(t)!;
        expect(parseOKLCH(val), `dark ${t}: "${val}" not OKLCH`).not.toBeNull();
      }
    });

    it('all light tokens parse as OKLCH', () => {
      for (const t of SEMANTIC) {
        const val = lightTokens.get(t)!;
        expect(parseOKLCH(val), `light ${t}: "${val}" not OKLCH`).not.toBeNull();
      }
    });
  });

  describe('brand hue unification', () => {
    it('dark and light --color-accent share hue angle 180', () => {
      const darkH = parseOKLCH(darkTokens.get('--color-accent')!)!.h;
      const lightH = parseOKLCH(lightTokens.get('--color-accent')!)!.h;
      expect(darkH).toBe(180);
      expect(lightH).toBe(180);
    });

    it('dark and light --color-accent-warm share hue angle 30', () => {
      const darkH = parseOKLCH(darkTokens.get('--color-accent-warm')!)!.h;
      const lightH = parseOKLCH(lightTokens.get('--color-accent-warm')!)!.h;
      expect(darkH).toBe(30);
      expect(lightH).toBe(30);
    });
  });

  describe('neutral tinting', () => {
    it('dark surface has non-zero chroma toward hue 180', () => {
      const { c, h } = parseOKLCH(darkTokens.get('--color-surface')!)!;
      expect(c).toBeGreaterThan(0);
      expect(h).toBe(180);
    });
  });
});
