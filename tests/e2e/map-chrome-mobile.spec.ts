import { test, expect } from '@playwright/test';

// MC-011: at ≤768px the chrome keeps zoom + basemap + scale bar but drops the
// export menu, draw tools, and the cursor-coordinate chip.
test('mobile chrome hides coords/draw/export, keeps basemap + zoom (MC-011)', async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/?site=placencia&panel=inspect');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);

  // basemap + zoom stay
  await expect(page.getByRole('radio', { name: 'Light' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible();
  // scale bar stays
  await expect(page.getByTestId('scale-bar')).toBeVisible();

  // export menu, draw tools, coordinate chip are gone
  await expect(page.getByTestId('map-export')).toHaveCount(0);
  await expect(page.getByTestId('coord-copy')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Transect query' })).toHaveCount(0);
});

test('desktop chrome shows export + coords + draw (MC-011 control)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/?site=placencia&panel=inspect');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);

  await expect(page.getByTestId('map-export')).toHaveCount(1);
  await expect(page.getByTestId('coord-copy')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Transect query' })).toBeVisible();
});
