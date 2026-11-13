import { test, expect } from '@playwright/test';

test('zoom buttons change the map zoom (MC-003)', async ({ page }) => {
  await page.goto('/?site=placencia');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as any).__mapInstance);
  // The `?site=` deep-link triggers an animated fitBounds (~1.2s, FLY_TO_DURATION_MS)
  // whose camera path changes zoom on its own. Wait for that initial animation to
  // settle before measuring/clicking so the button's effect isn't masked by the
  // in-flight animation (cf. ME-011 fly-to tests, which wait past the 1.2s fly).
  await page.waitForTimeout(500); // ensure the initial fitBounds has started
  await page.waitForFunction(
    () => {
      const m = (window as any).__mapInstance;
      return m && !m.isMoving() && !m.isZooming() && !m.isEasing();
    },
    undefined,
    { timeout: 6000 },
  );
  const before = await page.evaluate(() => (window as any).__mapDebug().zoom);
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.waitForTimeout(600);
  const after = await page.evaluate(() => (window as any).__mapDebug().zoom);
  expect(after).toBeGreaterThan(before);
});
