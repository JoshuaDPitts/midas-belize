import { test, expect } from '@playwright/test';

// Sections in the showcase page, matched to their heading text
const SECTIONS = [
  'Semantic Colors',
  'Data Visualization',
  'Diverging Scale',
  'Core UI Components (DS-004)',
  'Form & Overlay Components (DS-004 pt 2-3)',
  'Data Display (DS-005)',
  'Layer Controls (DS-009)',
  'Layer Interaction (DS-010)',
  'MIMES Domain Visualizations (DS-011)',
  'Scenario + Ecosystem Services (DS-012, DS-013)',
  'Page Layout + Navigation (DS-014, DS-015)',
  'Map Chrome (DS-006)',
  'Iconography (DS-008)',
  'Typography Split Scale (DS2-005)',
  'Radius (DS2-006)',
  'Shadow (DS2-006)',
];

test.describe('Design System Showcase — Visual Regression', () => {
  for (const theme of ['light', 'dark'] as const) {
    test.describe(`${theme} theme`, () => {
      test.beforeEach(async ({ page }) => {
        await page.goto('/design-system');
        // Page loads in light mode by default; switch if needed
        if (theme === 'dark') {
          await page.click('button:has-text("Switch to Dark")');
          // Wait for theme transition
          await page.waitForTimeout(300);
        }
        // Ensure the page has stabilized
        await expect(page.locator('h1').first()).toBeVisible();
        // Force all three font families to load (bold + regular + mono
        // at typical display sizes) before capturing. `document.fonts.ready`
        // alone only waits for fonts already referenced by the current DOM;
        // display-scale weights can still be pending and reflow layouts
        // mid-scroll-screenshot.
        await page.evaluate(async () => {
          await Promise.all([
            document.fonts.load('400 1rem "Funnel Sans"'),
            document.fonts.load('700 1rem "Funnel Sans"'),
            document.fonts.load('400 1rem "Funnel Display"'),
            document.fonts.load('700 1rem "Funnel Display"'),
            document.fonts.load('800 1rem "Funnel Display"'),
            document.fonts.load('400 1rem "commitMono"'),
            document.fonts.load('700 1rem "commitMono"'),
          ]);
          await document.fonts.ready;
        });
      });

      test(`full page screenshot — ${theme}`, async ({ page }) => {
        await expect(page).toHaveScreenshot(`full-page-${theme}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        });
      });

      for (const sectionTitle of SECTIONS) {
        const slug = sectionTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        test(`section: ${sectionTitle} — ${theme}`, async ({ page }) => {
          // Find the section by its heading
          const heading = page.locator(`h2:has-text("${sectionTitle}")`);
          await expect(heading).toBeVisible();

          // Screenshot the parent section element
          const section = heading.locator('..');
          await expect(section).toHaveScreenshot(`section-${slug}-${theme}.png`, {
            maxDiffPixelRatio: 0.02,
            animations: 'disabled',
          });
        });
      }
    });
  }
});
