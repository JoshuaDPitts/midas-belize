import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function read(p: string): string {
  return readFileSync(resolve(__dirname, '../../..', p), 'utf8');
}

/* Parses every top-level :root block and accumulates. Skips blocks
   nested inside @media (reduced-motion overrides live there). */
function parseRoot(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const stripped = css.replace(/@media[^{]*\{[\s\S]*?\n\}\s*\n?/g, '');
  for (const m of stripped.matchAll(/:root\s*\{([\s\S]*?)\}/g)) {
    for (const [, name, value] of m[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) {
      tokens.set(`--${name}`, value.trim());
    }
  }
  return tokens;
}

const radius = parseRoot(read('src/styles/tokens/radius.css'));
const shadow = parseRoot(read('src/styles/tokens/shadow.css'));
const motion = parseRoot(read('src/styles/tokens/motion.css'));
const space  = parseRoot(read('src/styles/tokens/space.css'));

describe('DS2-006: radius / shadow / motion / space gap-fill', () => {
  describe('radius', () => {
    const STEPS = ['xs', 'sm', 'md', 'lg', 'xl', 'pill', 'full'];
    it('defines 7 radius tokens', () => {
      for (const s of STEPS) {
        expect(radius.has(`--radius-${s}`), `missing --radius-${s}`).toBe(true);
      }
    });
    it('--radius-pill is 9999px', () => {
      expect(radius.get('--radius-pill')).toBe('9999px');
    });
    it('--radius-full is 50%', () => {
      expect(radius.get('--radius-full')).toBe('50%');
    });
  });

  describe('shadow', () => {
    const STEPS = ['sm', 'md', 'lg', 'glass-sm', 'glass-md'];
    it('defines 5 shadow tokens', () => {
      for (const s of STEPS) {
        expect(shadow.has(`--shadow-${s}`), `missing --shadow-${s}`).toBe(true);
      }
    });
    it('glass shadow tokens reference --glass-shadow', () => {
      expect(shadow.get('--shadow-glass-sm')).toMatch(/var\(--glass-shadow\)/);
      expect(shadow.get('--shadow-glass-md')).toMatch(/var\(--glass-shadow\)/);
    });
  });

  describe('motion', () => {
    it('defines durations fast/normal/slow/longer/longest', () => {
      for (const d of ['fast', 'normal', 'slow', 'longer', 'longest']) {
        expect(motion.has(`--duration-${d}`), `missing --duration-${d}`).toBe(true);
      }
    });
    it('--duration-longer is 600ms', () => {
      expect(motion.get('--duration-longer')).toBe('600ms');
    });
    it('--duration-longest is 900ms', () => {
      expect(motion.get('--duration-longest')).toBe('900ms');
    });
    it('defines ease-out, ease-out-quart, ease-in-out', () => {
      for (const e of ['out', 'out-quart', 'in-out']) {
        expect(motion.has(`--ease-${e}`), `missing --ease-${e}`).toBe(true);
      }
    });
  });

  describe('space', () => {
    const EXISTING = ['1', '2', '3', '4', '6', '8', '12', '16'];
    const NEW = ['24', '32', '40'];
    it('defines all pre-existing space tokens', () => {
      for (const s of EXISTING) {
        expect(space.has(`--space-${s}`), `missing --space-${s}`).toBe(true);
      }
    });
    it('defines new section-scale space tokens (24/32/40)', () => {
      for (const s of NEW) {
        expect(space.has(`--space-${s}`), `missing --space-${s}`).toBe(true);
      }
    });
    it('--space-24 is 96px', () => {
      expect(space.get('--space-24')).toBe('96px');
    });
    it('--space-32 is 128px', () => {
      expect(space.get('--space-32')).toBe('128px');
    });
    it('--space-40 is 160px', () => {
      expect(space.get('--space-40')).toBe('160px');
    });
  });
});
