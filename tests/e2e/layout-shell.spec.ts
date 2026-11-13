import { test, expect } from '@playwright/test';

test.describe('REQ-LS-005 — Stage 1 chrome on /', () => {
  test.setTimeout(45_000);

  test('home renders AppShell with rail icons', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('appshell-logo')).toBeVisible();
    await expect(page.getByTestId('rail-icon-layers')).toBeVisible();
    await expect(page.getByTestId('rail-icon-inspect')).toBeVisible();
  });

  test('site selector switches activeSite and updates URL', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('appshell-site-trigger').click();
    await page.getByRole('option', { name: /Placencia/i }).click();
    await expect(page).toHaveURL(/site=placencia/);
    await expect(page.getByTestId('appshell-site-trigger')).toContainText('Placencia');
  });

  test('panel URL sync round-trips on mount', async ({ page }) => {
    await page.goto('/?panel=inspect');
    await expect(page.getByTestId('appshell-sidebar-panel')).toBeVisible();
    await expect(page.getByTestId('panel-inspect')).toBeVisible();
  });

  test('rail click + close button cycle the panel', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('rail-icon-layers').click();
    await expect(page.getByTestId('appshell-sidebar-panel')).toBeVisible();
    await page.getByTestId('appshell-panel-close').click();
    await expect(page.getByTestId('appshell-sidebar-panel')).toBeHidden();
  });
});

test.describe('REQ-LS-016 — Stage 4 gate', () => {
  test.setTimeout(60_000);

  test('mobile bottom-sheet renders at ≤768px', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('/?panel=layers');
    await expect(page.locator('[data-testid="bottom-sheet"]')).toBeVisible();
    await expect(page.locator('[data-testid="bottom-sheet"]')).toHaveAttribute('data-snap', 'peek');
    await page.locator('[data-testid="sheet-handle"]').click();
    await expect(page.locator('[data-testid="bottom-sheet"]')).toHaveAttribute('data-snap', 'expanded');
  });

  test('mobile NavBar shows hamburger + opens menu with share button', async ({ page }) => {
    await page.setViewportSize({ width: 414, height: 896 });
    await page.goto('/');
    await expect(page.getByTestId('appshell-hamburger')).toBeVisible();
    await page.getByTestId('appshell-hamburger').click();
    // Modal opens — share button is visible somewhere in the modal.
    await expect(page.getByTestId('appshell-share')).toBeVisible();
  });

  test('desktop chrome renders without console errors after a site switch', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.getByTestId('appshell-site-trigger').click();
    await page.getByRole('option', { name: /Placencia/i }).click();
    await expect(page).toHaveURL(/site=placencia/);
    // The /api/scenarios/[site] 500 in local dev is a documented separate
    // concern (no Firebase Admin SDK creds in dev). Filter it out so this
    // assertion only catches new render-storm regressions.
    const filtered = errors.filter(
      (e) => !/api\/scenarios/.test(e) && !/Failed to load resource.*500/i.test(e),
    );
    expect(filtered).toHaveLength(0);
  });
});
