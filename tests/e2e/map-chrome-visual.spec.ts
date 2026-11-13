import { test, expect, type Page } from '@playwright/test';

// MC-012: MapChrome visual baselines (light/dark). The map canvas is hidden
// behind a fixed neutral background so the translucent glass chrome renders
// deterministically (live tiles are non-deterministic; masking the full-viewport
// canvas would just cover the whole chrome). We baseline the floating control
// cluster (zoom + basemap + export) — opaque themed UI that genuinely differs
// between light and dark. Theme is seeded via localStorage['midas-theme'] before
// navigation (the app themes via the persisted atom → data-theme; emulateMedia
// colorScheme has no effect here).

async function load(page: Page, theme: 'light' | 'dark') {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((t) => {
    try {
      localStorage.setItem('midas-theme', JSON.stringify(t));
    } catch {
      /* storage unavailable */
    }
  }, theme);
  await page.goto('/?site=placencia');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as { __mapInstance?: unknown }).__mapInstance);
  await page.waitForTimeout(1200);
  // Replace the non-deterministic live tiles with a fixed neutral backdrop so
  // the glass chrome's backdrop-filter resolves to a stable image.
  await page.addStyleTag({
    content:
      '.maplibregl-canvas{visibility:hidden!important}.maplibregl-map{background:#7a7a7a!important}',
  });
  await page.waitForTimeout(200);
}

for (const theme of ['light', 'dark'] as const) {
  test(`map chrome controls ${theme}`, async ({ page }) => {
    await load(page, theme);
    await expect(page.getByTestId('map-chrome-controls')).toHaveScreenshot(
      `map-chrome-controls-${theme}.png`,
      { maxDiffPixelRatio: 0.05 },
    );
  });
}
