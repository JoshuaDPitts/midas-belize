import { createRequire } from 'node:module';
const require = createRequire('/Users/jpitts/Library/Mobile Documents/com~apple~CloudDocs/Documents/DocumentsNEW/Projects/midas_belize/package.json');
const { chromium } = require('@playwright/test');

const BASE = 'https://midas-belize-prod.web.app/';
const SITES = ['placencia', 'caye-caulker', 'laughing-bird'];
const RUNS = 2;

const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const results = [];
for (const site of SITES) {
  for (let r = 1; r <= RUNS; r++) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage(); const cdp = await ctx.newCDPSession(page); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 200000, uploadThroughput: 93750 });
    await page.addInitScript(() => {
      window.__lcp = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; })
        .observe({ type: 'largest-contentful-paint', buffered: true });
    });
    const dataReqs = [];
    page.on('requestfinished', async (req) => {
      if (req.url().includes('/api/data/')) {
        const t = req.timing();
        dataReqs.push({ url: req.url().split('/api/data/')[1], end: t.responseEnd });
      }
    });
    const t0 = Date.now();
    await page.goto(`${BASE}?site=${site}`, { waitUntil: 'load', timeout: 90000 });
    let canvasMs = null;
    try { await page.waitForSelector('canvas', { timeout: 60000 }); canvasMs = Date.now() - t0; } catch {}
    let idleMs = null;
    try { await page.waitForLoadState('networkidle', { timeout: 90000 }); idleMs = Date.now() - t0; } catch {}
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const res = performance.getEntriesByType('resource');
      const sum = (f) => res.filter(f).reduce((a, e) => a + (e.transferSize || 0), 0);
      return {
        ttfb: Math.round(nav.responseStart),
        dcl: Math.round(nav.domContentLoadedEventEnd),
        load: Math.round(nav.loadEventEnd),
        lcp: Math.round(window.__lcp),
        requests: res.length + 1,
        totalKB: Math.round((sum(() => true) + (nav.transferSize || 0)) / 1024),
        jsKB: Math.round(sum((e) => e.initiatorType === 'script' || /\.js(\?|$)/.test(e.name)) / 1024),
        dataKB: Math.round(sum((e) => e.name.includes('/api/data/')) / 1024),
        dataReqs: res.filter((e) => e.name.includes('/api/data/')).length,
      };
    });
    results.push({ site, run: r, canvasMs, idleMs, ...m });
    console.log(JSON.stringify(results.at(-1)));
    await ctx.close();
  }
}
await browser.close();
