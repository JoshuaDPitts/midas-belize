import { test, expect, type Page } from '@playwright/test';

/**
 * Shared helpers — mirror marine.spec.ts conventions:
 * - Theme pre-seeded via localStorage addInitScript
 * - Next.js dev overlay suppressed
 * - prefers-reduced-motion injected for snapshot determinism
 * - Screenshots scoped to sidebar panel (map canvas is non-deterministic)
 */
async function seedWatershedState(
  page: Page,
  opts: { site: string; theme: 'light' | 'dark' },
) {
  await page.addInitScript((t) => {
    localStorage.setItem('midas-theme', JSON.stringify(t));
  }, opts.theme);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`/?site=${opts.site}&panel=domain`);
  await page.addStyleTag({
    content:
      'nextjs-portal{display:none!important;}[data-nextjs-toast]{display:none!important;}',
  }).catch(() => {});
  await page.evaluate((t) => {
    document.documentElement.setAttribute('data-theme', t);
  }, opts.theme);
  // Switch to the Watershed sub-tab if multiple verticals contribute.
  const watershedTab = page.getByRole('tab', { name: 'Watershed' });
  if (await watershedTab.isVisible().catch(() => false)) {
    await watershedTab.click();
  }
  await expect(page.getByTestId('watershed-domain-content').or(page.getByTestId('watershed-empty-offshore'))).toBeVisible({
    timeout: 15000,
  });
  // Force theme after every re-render trigger (tab click, SWR resolve).
  // atomWithStorage subscription can overwrite data-theme; re-force it
  // and wait for CSS custom properties to cascade before screenshots.
  for (let i = 0; i < 3; i++) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, opts.theme);
    await page.waitForTimeout(300);
  }
}

// ---------------------------------------------------------------------------
// Functional flows
// ---------------------------------------------------------------------------

test.describe('Watershed functional', () => {
  test('Domain panel renders NbS ranking for Placencia', async ({ page }) => {
    await seedWatershedState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('watershed-tier-1-panel')).toBeVisible();
    await expect(page.getByTestId('nbs-rank-list')).toBeVisible();
  });

  test('Laughing Bird shows offshore empty state with upstream CTA', async ({ page }) => {
    await seedWatershedState(page, { site: 'laughing-bird', theme: 'light' });
    await expect(page.getByTestId('watershed-empty-offshore')).toBeVisible();
    await expect(page.getByRole('button', { name: /upstream context/i })).toBeVisible();
  });

  test('Clicking a ranked watershed shows the hero card', async ({ page }) => {
    await seedWatershedState(page, { site: 'placencia', theme: 'light' });
    // Wait for ranking data to settle.
    await page.waitForTimeout(1500);
    const firstRow = page.locator('[data-testid="nbs-rank-list"] li:first-child button');
    await firstRow.click();
    await expect(page.getByTestId('watershed-hero-card')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /Back to ranking/i })).toBeVisible();
  });

  test('Compare to activates compare controls on the map', async ({ page }) => {
    await seedWatershedState(page, { site: 'placencia', theme: 'light' });
    await page.waitForTimeout(1500);
    const firstRow = page.locator('[data-testid="nbs-rank-list"] li:first-child button');
    await firstRow.click();
    await expect(page.getByTestId('watershed-hero-card')).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Compare to/i }).click();
    await expect(page.getByTestId('watershed-swipe-root')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Compare watersheds/i)).toBeVisible();
  });

  test('Deep dive section renders RUSLE card + rainfall seasonality', async ({ page }) => {
    await seedWatershedState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('watershed-rusle-card')).toBeVisible();
    await expect(page.getByTestId('rainfall-seasonality')).toBeVisible();
  });

  test('Encoder picker switches between NbS / Clade / Restoration / Erosion Risk', async ({
    page,
  }) => {
    await seedWatershedState(page, { site: 'placencia', theme: 'light' });
    const picker = page.getByRole('radiogroup', { name: /Watershed map color encoding/i });
    await expect(picker).toBeVisible();
    // NbS is default.
    await expect(page.getByRole('radio', { name: /NbS/i })).toHaveAttribute('aria-checked', 'true');
    // Click Erosion Risk.
    await page.getByRole('radio', { name: /Erosion Risk/i }).click();
    await expect(page.getByRole('radio', { name: /Erosion Risk/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await expect(page.getByTestId('watershed-legend')).toContainText(/Erosion risk/i);
  });
});

// ---------------------------------------------------------------------------
// Visual baselines — sidebar panel only (map canvas excluded)
// ---------------------------------------------------------------------------

test.describe('Watershed visual baselines', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const site of ['placencia', 'caye-caulker'] as const) {
      test(`watershed-domain-${theme}-${site}`, async ({ page }) => {
        await seedWatershedState(page, { site, theme });
        // Wait for SWR data to settle so the ranking rows stabilise.
        await page.waitForTimeout(2500);
        // Re-force theme right before screenshot — SWR resolves can reset it.
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        await page.waitForTimeout(200);
        const panel = page.getByTestId('appshell-sidebar-panel');
        await expect(panel).toHaveScreenshot(`watershed-domain-${theme}-${site}.png`, {
          maxDiffPixelRatio: 0.05,
        });
      });
    }
  }

  // Laughing Bird has a distinct empty state — capture it.
  for (const theme of ['light', 'dark'] as const) {
    test(`watershed-offshore-${theme}`, async ({ page }) => {
      await seedWatershedState(page, { site: 'laughing-bird', theme });
      const panel = page.getByTestId('appshell-sidebar-panel');
      await expect(panel).toHaveScreenshot(`watershed-offshore-${theme}.png`, {
        maxDiffPixelRatio: 0.02,
      });
    });
  }
});
