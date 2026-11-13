import { test, expect } from '@playwright/test';

async function openExport(page: import('@playwright/test').Page) {
  await page.goto('/?site=placencia&panel=domain');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as any).__mapInstance);
  await page.waitForTimeout(2000); // let the active vertical fetch + publish features
  await page.getByRole('button', { name: 'Export' }).click();
}

test('GeoJSON export is a valid FeatureCollection (MC-007)', async ({ page }) => {
  await openExport(page);
  await expect(page.getByTestId('export-geojson')).toBeEnabled();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-geojson').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.geojson$/);
  const stream = await dl.createReadStream(); const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  expect(json.type).toBe('FeatureCollection');
  expect(Array.isArray(json.features)).toBe(true);
  expect(json.features.length).toBeGreaterThan(0);
});

test('CSV export has a header + rows (MC-007)', async ({ page }) => {
  await openExport(page);
  await expect(page.getByTestId('export-csv')).toBeEnabled();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByTestId('export-csv').click()]);
  expect(dl.suggestedFilename()).toMatch(/\.csv$/);
  const stream = await dl.createReadStream(); const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const lines = Buffer.concat(chunks).toString('utf8').split('\r\n').filter(Boolean);
  expect(lines.length).toBeGreaterThan(1);
});
