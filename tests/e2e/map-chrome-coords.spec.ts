import { test, expect, type Page } from '@playwright/test';

async function ready(page: Page) {
  await page.goto('/?site=placencia');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as any).__mapInstance);
  await page.waitForSelector('[data-testid="coord-copy"]');
  await page.waitForTimeout(500);
}
async function moveTo(page: Page, lng: number, lat: number) {
  await page.evaluate(({ lng, lat }) => {
    const m = (window as any).__mapInstance; const p = m.project([lng, lat]);
    const c = document.querySelector('.maplibregl-canvas') as HTMLElement;
    const r = c.getBoundingClientRect();
    c.dispatchEvent(new MouseEvent('mousemove', { clientX: r.left + p.x, clientY: r.top + p.y, bubbles: true }));
  }, { lng, lat });
}

test.describe('MapChrome coordinates + scale (MC-004)', () => {
  test('cursor move shows 5dp lat/lon', async ({ page }) => {
    await ready(page);
    await moveTo(page, -88.45, 17.25);
    await expect(page.locator('[data-testid="coord-copy"]')).toHaveText(/-?\d+\.\d{5},\s*-?\d+\.\d{5}/);
  });
  test('click copies lat,lon to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await ready(page);
    await moveTo(page, -88.45, 17.25);
    await page.locator('[data-testid="coord-copy"]').click();
    await expect(page.locator('[data-testid="coord-copied"]')).toBeVisible();
    const txt = await page.evaluate(() => navigator.clipboard.readText());
    expect(txt).toMatch(/^-?\d+\.\d{5},-?\d+\.\d{5}$/);
  });
  test('scale bar shows m/km label', async ({ page }) => {
    await ready(page);
    await expect(page.locator('[data-testid="scale-bar"]')).toBeVisible();
    await expect(page.locator('[data-testid="scale-bar"]')).toHaveText(/\b\d+\s*(m|km)\b/);
  });
});
