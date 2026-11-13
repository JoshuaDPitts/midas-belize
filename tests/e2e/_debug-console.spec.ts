import { test } from '@playwright/test';

test('dump console + failed requests', async ({ page }) => {
  const errors: string[] = [];
  const failed: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[console.error] ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  page.on('requestfailed', (req) =>
    failed.push(`[reqfail] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`),
  );
  page.on('response', (res) => {
    if (res.status() >= 400) failed.push(`[res${res.status()}] ${res.url()}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem('midas-theme', JSON.stringify('dark'));
  });
  await page.goto('/?site=placencia&panel=domain');
  await page.waitForTimeout(8000);
  console.log('--- ERRORS ---');
  for (const e of errors) console.log(e);
  console.log('--- FAILED REQUESTS ---');
  for (const f of failed) console.log(f);
});
