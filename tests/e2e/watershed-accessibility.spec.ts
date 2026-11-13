import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openWatershedDomain(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('midas-theme', JSON.stringify('light'));
  });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/?site=placencia&panel=domain');
  await page.addStyleTag({
    content: 'nextjs-portal{display:none!important;}[data-nextjs-toast]{display:none!important;}',
  }).catch(() => {});
  await page.getByRole('tab', { name: 'Watershed' }).click();
  await expect(page.getByTestId('watershed-domain-content')).toBeVisible({ timeout: 15000 });
}

test.describe('Watershed accessibility', () => {
  test('domain panel has no axe violations with reduced motion', async ({ page }) => {
    await openWatershedDomain(page);

    const results = await new AxeBuilder({ page })
      .include('[data-testid="appshell-sidebar-panel"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('NbS rank list supports arrow-key focus and Enter selection', async ({ page }) => {
    await openWatershedDomain(page);
    const rankList = page.getByTestId('nbs-rank-list');
    await expect(rankList).toBeVisible({ timeout: 15000 });

    // Wait for list to stabilise (SWR join data may reorder rows).
    await page.waitForTimeout(1500);

    // Focus the first button in the rank list, whatever its label is.
    const focusedLabel = await page.evaluate(() => {
      const btn = document.querySelector<HTMLElement>('[data-testid="nbs-rank-list"] li:first-child button');
      btn?.focus();
      return document.activeElement?.getAttribute('aria-label') ?? '';
    });
    expect(focusedLabel).toMatch(/^Rank \d+:/);

    // ArrowDown should move focus to a different rank button.
    await page.keyboard.press('ArrowDown');
    const nextLabel = await page.evaluate(() =>
      document.activeElement?.getAttribute('aria-label') ?? '',
    );
    expect(nextLabel).toMatch(/^Rank \d+:/);
    expect(nextLabel).not.toBe(focusedLabel);

    // Enter selects the polygon and shows the "Back to ranking" chip.
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: /Back to ranking/i })).toBeVisible({ timeout: 5000 });
  });
});
