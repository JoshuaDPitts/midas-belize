import { test, expect, type Page } from '@playwright/test';

/**
 * Playwright e2e tests for Scenario Engine (Phase 2 vertical #5)
 *
 * Coverage:
 * - Scenarios sidebar panel with the 8-scenario matrix
 * - Scenario selection + availability badges
 * - Compare CTA navigation
 * - /compare route with Diff and Swipe layouts
 * - Visual baselines for light + dark themes
 *
 * Selectors are validated against the real DOM:
 * - Rail tab button:        [data-testid="rail-icon-scenarios"] (aria-label "Scenarios")
 * - Panel container:        [data-testid="scenarios-panel"]
 * - Scenario cards:         button[role="radio"][data-scenario-id="..."] (aria-checked)
 * - Availability dots:      span[data-domain="marine|watershed|coastal"]
 * - Compare toolbar:        [data-testid="compare-toolbar"]
 * - Diff layout container:  [data-testid="compare-diff-map"]
 * - Swipe layout container: [data-testid="compare-swipe"] (+ [data-testid="swipe-curtain"])
 *
 * activeScenarioAtom is NOT persisted, so scenario state is seeded via the
 * ?scenario= URL param (useScenarioUrlSync hydrates the atom on mount), not
 * localStorage.
 */

async function applyTheme(page: Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  // The app drives theming from themeAtom (atomWithStorage 'midas-theme',
  // getOnInit:true) → data-theme attribute, NOT prefers-color-scheme. Seed
  // localStorage before any app script runs so the theme is applied on first
  // paint. Must be registered before page.goto().
  await page.addInitScript((t) => {
    try {
      window.localStorage.setItem('midas-theme', JSON.stringify(t));
    } catch {
      /* storage unavailable — ignore */
    }
  }, theme);
}

/** Navigate to the explore page with a seeded site + scenario, then open the Scenarios panel. */
async function openScenariosPanel(
  page: Page,
  options: { site?: string; theme?: 'light' | 'dark'; scenario?: string } = {},
) {
  const { site = 'placencia', theme = 'light', scenario = 'basecase' } = options;
  await applyTheme(page, theme);
  await page.goto(`/?site=${site}&scenario=${scenario}`);
  await page.waitForLoadState('networkidle');

  await page.locator('[data-testid="rail-icon-scenarios"]').click();
  await expect(page.locator('[data-testid="scenarios-panel"]')).toBeVisible();
}

test.describe('Scenario Engine', () => {
  test('scenario panel renders 8-scenario matrix grouped, Base Case seeded as active', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    // Three group headings (scope to headings to avoid matching card body text)
    await expect(page.getByRole('heading', { name: 'Base Case' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Urban-driven' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'SLR-driven' })).toBeVisible();

    // Exactly 8 scenario cards. Use [data-scenario-id] (unique to matrix cards)
    // rather than [role="radio"] — other always-mounted map chrome on the explore
    // page also uses role="radio", so the broad selector over-counts.
    const cards = page.locator('[data-scenario-id]');
    await expect(cards).toHaveCount(8);

    // Base Case seeded via ?scenario=basecase is the checked card
    const basecase = page.locator('[data-scenario-id="basecase"]');
    await expect(basecase).toHaveAttribute('aria-checked', 'true');

    await expect(page.locator('[data-testid="scenarios-panel"]')).toHaveScreenshot(
      'scenarios-panel-light.png',
    );
  });

  test('scenario panel dark theme', async ({ page }) => {
    await openScenariosPanel(page, { theme: 'dark', scenario: 'basecase' });
    await expect(page.locator('[data-testid="scenarios-panel"]')).toHaveScreenshot(
      'scenarios-panel-dark.png',
    );
  });

  test('clicking a scenario card updates the active scenario', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    const scenarioG = page.locator('[data-scenario-id="G"]');
    await scenarioG.click();
    await expect(scenarioG).toHaveAttribute('aria-checked', 'true');

    // Base Case is no longer the active card
    await expect(page.locator('[data-scenario-id="basecase"]')).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  test('availability badges show three per-vertical dots per card', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    const basecase = page.locator('[data-scenario-id="basecase"]');
    // One dot each for marine / watershed / coastal
    await expect(basecase.locator('span[data-domain]')).toHaveCount(3);
    await expect(basecase.locator('span[data-domain="marine"]')).toHaveCount(1);
    await expect(basecase.locator('span[data-domain="watershed"]')).toHaveCount(1);
    await expect(basecase.locator('span[data-domain="coastal"]')).toHaveCount(1);
  });

  test('compare CTA navigates to the /compare route', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    await page.getByRole('link', { name: /compare scenarios/i }).click();
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/compare/);
  });

  test('/compare renders toolbar and diff layout by default', async ({ page }) => {
    await applyTheme(page, 'light');
    await page.goto('/compare?b=G&v=coastal&mode=diff');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="compare-toolbar"]')).toBeVisible();
    await expect(page.locator('[data-testid="compare-diff-map"]')).toBeVisible();
    await expect(page.locator('[data-testid="compare-swipe"]')).toHaveCount(0);

    await expect(page).toHaveScreenshot('compare-diff-light.png', { fullPage: true });
  });

  test('/compare honors ?a= for Scenario A on direct load', async ({ page }) => {
    await applyTheme(page, 'light');
    await page.goto('/compare?a=B&b=G&v=coastal&mode=diff');
    await page.waitForLoadState('networkidle');

    // Comparison renders (not the empty state) and Scenario A reflects ?a=B
    await expect(page.locator('[data-testid="compare-diff-map"]')).toBeVisible();
    await expect(page.getByLabel('Scenario A')).toHaveValue('B');
  });

  test('/compare swipe mode renders the two-map curtain layout', async ({ page }) => {
    await applyTheme(page, 'light');
    await page.goto('/compare?b=G&v=coastal&mode=swipe');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="compare-swipe"]')).toBeVisible();
    await expect(page.locator('[data-testid="swipe-curtain"]')).toBeVisible();
    await expect(page.locator('[data-testid="compare-diff-map"]')).toHaveCount(0);

    await expect(page).toHaveScreenshot('compare-swipe-light.png', { fullPage: true });
  });

  test('/compare dark theme', async ({ page }) => {
    await applyTheme(page, 'dark');
    await page.goto('/compare?b=G&v=coastal&mode=diff');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('[data-testid="compare-toolbar"]')).toBeVisible();
    await expect(page).toHaveScreenshot('compare-diff-dark.png', { fullPage: true });
  });

  test('/compare mobile viewport (768px) keeps the toolbar visible', async ({ page }) => {
    await applyTheme(page, 'light');
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/compare?b=G&v=coastal&mode=diff');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="compare-toolbar"]')).toBeVisible();
    await expect(page).toHaveScreenshot('compare-mobile-768.png', { fullPage: true });
  });

  test('keyboard: ArrowRight moves focus to the next scenario in the group', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    // Urban group order is [G, B]; ArrowRight from G focuses B
    const scenarioG = page.locator('[data-scenario-id="G"]');
    await scenarioG.focus();
    await page.keyboard.press('ArrowRight');

    await expect(page.locator('[data-scenario-id="B"]')).toBeFocused();
  });

  test('keyboard: Space selects the focused scenario', async ({ page }) => {
    await openScenariosPanel(page, { scenario: 'basecase' });

    const scenarioG = page.locator('[data-scenario-id="G"]');
    await scenarioG.focus();
    await page.keyboard.press('Space');

    await expect(scenarioG).toHaveAttribute('aria-checked', 'true');
  });

  test('/compare shows empty state when no Scenario B is selected', async ({ page }) => {
    await applyTheme(page, 'light');
    await page.goto('/compare');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Select Two Scenarios to Compare')).toBeVisible();
    await expect(page.locator('[data-testid="compare-diff-map"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="compare-swipe"]')).toHaveCount(0);
  });
});
