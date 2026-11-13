import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const typographyPath = resolve(__dirname, '../../../src/styles/tokens/typography.css');
const layoutPath = resolve(__dirname, '../../../src/app/layout.tsx');

function fileExists(p: string): boolean {
  return existsSync(p);
}

function readIfExists(p: string): string {
  return fileExists(p) ? readFileSync(p, 'utf8') : '';
}

describe('DS2-002: Next.js font loading', () => {
  describe('font files', () => {
    it('ships Commit Mono 400 otf', () => {
      expect(
        fileExists(resolve(__dirname, '../../../public/fonts/CommitMono-400-Regular.otf')),
      ).toBe(true);
    });

    it('ships Commit Mono 700 otf', () => {
      expect(
        fileExists(resolve(__dirname, '../../../public/fonts/CommitMono-700-Regular.otf')),
      ).toBe(true);
    });
  });

  describe('layout.tsx', () => {
    const layout = readIfExists(layoutPath);

    it('imports Funnel_Display from next/font/google', () => {
      expect(layout).toMatch(/import\s*\{\s*[^}]*Funnel_Display[^}]*\}\s*from\s*['"]next\/font\/google['"]/);
    });

    it('imports Funnel_Sans from next/font/google', () => {
      expect(layout).toMatch(/import\s*\{\s*[^}]*Funnel_Sans[^}]*\}\s*from\s*['"]next\/font\/google['"]/);
    });

    it('imports localFont from next/font/local', () => {
      expect(layout).toMatch(/import\s+localFont\s+from\s+['"]next\/font\/local['"]/);
    });

    it('applies all three font variables to <html>', () => {
      expect(layout).toMatch(/--font-display-var/);
      expect(layout).toMatch(/--font-sans-var/);
      expect(layout).toMatch(/--font-mono-var/);
    });
  });

  describe('typography.css tokens', () => {
    const css = readIfExists(typographyPath);

    it('defines --font-display', () => {
      expect(css).toMatch(/--font-display\s*:\s*[^;]+;/);
    });

    it('defines --font-sans', () => {
      expect(css).toMatch(/--font-sans\s*:\s*[^;]+;/);
    });

    it('defines --font-mono', () => {
      expect(css).toMatch(/--font-mono\s*:\s*[^;]+;/);
    });

    it('--font-display wires to Next.js CSS variable', () => {
      expect(css).toMatch(/--font-display\s*:\s*var\(--font-display-var\)/);
    });

    it('--font-sans wires to Next.js CSS variable', () => {
      expect(css).toMatch(/--font-sans\s*:\s*var\(--font-sans-var\)/);
    });

    it('--font-mono wires to Next.js CSS variable', () => {
      expect(css).toMatch(/--font-mono\s*:\s*var\(--font-mono-var\)/);
    });
  });
});
