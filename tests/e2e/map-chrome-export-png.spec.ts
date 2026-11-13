// tests/e2e/map-chrome-export-png.spec.ts
import { test, expect } from '@playwright/test';

test('PNG export downloads a valid PNG (MC-006)', async ({ page }) => {
  // Navigate to the default Belize view (no ?site=): with a site active the
  // url-sync hook would populate activeSiteAtom and buildFilename would emit a
  // `-<site>` segment, which the filename assertion below intentionally
  // disallows. The PNG path works on `/` (see useExport.exportPng).
  await page.goto('/');
  await page.waitForSelector('.maplibregl-canvas');
  await page.waitForFunction(() => !!(window as any).__mapInstance);
  // Let the basemap tiles paint so the captured canvas has real content.
  await page.waitForTimeout(1000);
  await page.getByRole('button', { name: 'Export' }).click();
  const [dl] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('export-png').click(),
  ]);
  expect(dl.suggestedFilename()).toMatch(/^midas-belize-\d{4}-\d{2}-\d{2}\.png$/);
  const stream = await dl.createReadStream();
  const chunks: Buffer[] = [];
  for await (const c of stream) chunks.push(c as Buffer);
  const buf = Buffer.concat(chunks);
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buf.byteLength).toBeGreaterThan(1000);
});
