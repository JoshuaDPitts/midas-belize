import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Shared helpers — mirrors watershed.spec.ts conventions:
 * - Theme pre-seeded via localStorage addInitScript
 * - Next.js dev overlay suppressed
 * - prefers-reduced-motion injected for snapshot determinism
 * - Screenshots scoped to sidebar panel (map canvas is non-deterministic)
 */
async function seedCoastalState(
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
  // Switch to the Coastal sub-tab if multiple verticals contribute.
  const coastalTab = page.getByRole('tab', { name: 'Coastal' });
  if (await coastalTab.isVisible().catch(() => false)) {
    await coastalTab.click();
  }
  await expect(
    page
      .getByTestId('coastal-domain-content')
      .or(page.getByTestId('coastal-empty-offshore')),
  ).toBeVisible({ timeout: 15000 });
  // Force theme after every re-render trigger (tab click, SWR resolve).
  for (let i = 0; i < 3; i++) {
    await page.evaluate((t) => {
      document.documentElement.setAttribute('data-theme', t);
    }, opts.theme);
    await page.waitForTimeout(300);
  }
}

// ---------------------------------------------------------------------------
// Visual baselines
// ---------------------------------------------------------------------------

test.describe('Coastal visual baselines', () => {
  test('Placencia light', async ({ page }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-placencia-light.png',
    );
  });

  test('Placencia dark', async ({ page }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'dark' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-placencia-dark.png',
    );
  });

  test('Caye Caulker light', async ({ page }) => {
    await seedCoastalState(page, { site: 'caye-caulker', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-cayecaulker-light.png',
    );
  });

  test('Caye Caulker dark', async ({ page }) => {
    await seedCoastalState(page, { site: 'caye-caulker', theme: 'dark' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-cayecaulker-dark.png',
    );
  });

  test('Laughing Bird offshore light', async ({ page }) => {
    await seedCoastalState(page, { site: 'laughing-bird', theme: 'light' });
    await expect(page.getByTestId('coastal-empty-offshore')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-lbc-offshore-light.png',
    );
  });

  test('Laughing Bird offshore dark', async ({ page }) => {
    await seedCoastalState(page, { site: 'laughing-bird', theme: 'dark' });
    await expect(page.getByTestId('coastal-empty-offshore')).toBeVisible();
    await expect(page.getByTestId('appshell-sidebar-panel')).toHaveScreenshot(
      'coastal-lbc-offshore-dark.png',
    );
  });
});

// ---------------------------------------------------------------------------
// Functional flows
// ---------------------------------------------------------------------------

test.describe('Coastal functional', () => {
  test('Vulnerability ranking panel renders (with data or empty state)', async ({
    page,
  }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    // VulnerabilityRanking renders either the rank list or an empty state
    // depending on whether coastal polygon data is published.
    const panel = page.getByTestId('vuln-ranking-panel');
    await expect(panel).toBeVisible({ timeout: 10000 });
    // Wait until loading spinner disappears (SWR settled) — the component shows
    // "Loading…" while fetching, then either data or empty-state.
    await expect(panel.locator('[aria-live="polite"]')).not.toBeVisible({
      timeout: 15000,
    });
  });

  test('Resolution toggle switches between hi-res and lo-res', async ({ page }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    // Find the resolution radiogroup.
    const resGroup = page
      .getByRole('radiogroup')
      .filter({ hasText: /Hi-res/i });
    await expect(resGroup).toBeVisible({ timeout: 10000 });
    // Check hi-res is default.
    await expect(resGroup.getByRole('radio', { name: /Hi-res/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    // Switch to lo-res.
    await resGroup.getByRole('radio', { name: /Lo-res/i }).click();
    await expect(resGroup.getByRole('radio', { name: /Lo-res/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  test('Scenario picker renders groups and clicking selects a scenario', async ({
    page,
  }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    // Scroll the sidebar panel to bottom to reveal Section 3.
    await page.getByTestId('coastal-domain-content').evaluate((el) => {
      el.scrollIntoView({ behavior: 'instant', block: 'end' });
    });
    await page.waitForTimeout(500);
    const picker = page.getByTestId('scenario-picker');
    await expect(picker).toBeVisible({ timeout: 10000 });
    // Both groups present.
    await expect(picker.getByText('Urban-driven')).toBeVisible();
    await expect(picker.getByText('SLR-driven')).toBeVisible();
    // Clicking scenario G (aria-label contains "Moderate Urban") selects it.
    // Pills use role="button" + aria-pressed (not role="radio").
    const scenarioG = picker.getByRole('button', { name: /Moderate Urban/i });
    await expect(scenarioG).toBeVisible();
    await scenarioG.click();
    await expect(scenarioG).toHaveAttribute('aria-pressed', 'true');
  });

  test('Laughing Bird offshore CTA navigates to Placencia', async ({ page }) => {
    await seedCoastalState(page, { site: 'laughing-bird', theme: 'light' });
    const offshoreState = page.getByTestId('coastal-empty-offshore');
    await expect(offshoreState).toBeVisible();
    // Find and click the Placencia CTA.
    const cta = offshoreState.getByRole('button', { name: /View Placencia/i });
    await expect(cta).toBeVisible();
    await cta.click();
    // Should now show Placencia coastal panel.
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible({
      timeout: 10000,
    });
  });
});

// ---------------------------------------------------------------------------
// Accessibility
// ---------------------------------------------------------------------------

test.describe('Coastal accessibility', () => {
  test('domain panel has no axe violations with reduced motion', async ({ page }) => {
    await seedCoastalState(page, { site: 'placencia', theme: 'light' });
    await expect(page.getByTestId('coastal-domain-content')).toBeVisible();
    // Wait for data-driven content to settle before scanning.
    await page.waitForTimeout(1500);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="appshell-sidebar-panel"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
