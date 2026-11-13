import { test, expect } from '@playwright/test';

test.describe('Marine vertical', () => {
  test('Domain rail icon → Marine hero panel renders for active site', async ({ page }) => {
    await page.goto('/?site=placencia');
    await page.getByTestId('rail-icon-domain').click();
    // Post-MA-016 the domain panel composes MarineHeroPanel + SiteAggregateCard.
    // The site label is the load-bearing assertion ("Placencia").
    await expect(page.getByTestId('site-aggregate-label')).toContainText('Placencia');
  });

  test('Layers tab surfaces marine datasets via useLayersForSite', async ({ page }) => {
    await page.goto('/?site=placencia&panel=layers');
    // The marine-specific manifest layersRowGroup was retired post-MA-017
    // (it duplicated the platform LayersTab rows). The LayersTab now renders
    // marine datasets via useLayersForSite — assert at least one marine row.
    await expect(page.getByTestId('panel-layers')).toBeVisible();
    await expect(page.getByTestId('layer-row-placencia-marine-polygons')).toBeVisible();
  });

  test('Cross-tab handoff: polygon click → Inspect → Open in Marine analysis → Domain', async ({
    page,
  }) => {
    test.skip(true, 'Awaiting synthetic polygon-click harness in MarineDomainContent');
  });

  test('BottomBar PlaybackController advances TimeSeriesPlayer playhead', async ({ page }) => {
    test.skip(true, 'Requires time-aware marine layer to mount the BottomBar');
  });
});

test.describe('Marine — visual baselines', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const site of ['placencia', 'caye-caulker'] as const) {
      test(`marine-domain-${theme}-${site}`, async ({ page }) => {
        // Inject theme into localStorage before the page loads so React/atomWithStorage
        // picks it up on first render and doesn't need a post-load re-paint.
        await page.addInitScript((t) => {
          localStorage.setItem('midas-theme', JSON.stringify(t));
        }, theme);
        // Hide the Next.js dev-error overlay — three underlying dev-only errors
        // surface its "N Issue" pill in the bottom-left and pollute screenshots:
        //   (a) /api/scenarios/[site] 500 (missing Firebase Admin SDK creds in local dev)
        //   (b) /api/data/placencia-30polygons-shape 404 (dataset not published locally)
        //   (c) themeAtom hydration mismatch (SSR vs CSR theme toggle aria-label / icon)
        // All three predate Marine v1.5; tracked in SESSION-LOG. The overlay is a dev-only
        // ornament, not a UI concern, so suppressing it gives a clean deterministic baseline.
        await page.addStyleTag({
          content: 'nextjs-portal{display:none!important;}[data-nextjs-toast]{display:none!important;}',
        }).catch(() => {});
        await page.goto(`/?site=${site}&panel=domain`);
        // Re-inject after navigation since addStyleTag is per-document.
        await page.addStyleTag({
          content: 'nextjs-portal{display:none!important;}[data-nextjs-toast]{display:none!important;}',
        }).catch(() => {});
        // Belt-and-suspenders: also set the attribute directly in case the atom
        // hasn't hydrated yet (e.g. SSR vs CSR timing differences).
        await page.evaluate((t) => {
          document.documentElement.setAttribute('data-theme', t);
        }, theme);
        // SiteAggregateCard renders site-aggregate-skeleton while the polygon
        // SWR fetches resolve; site-aggregate-label appears once loading=false.
        // 15s timeout covers cold-cache parallel-worker contention against the dev API.
        await expect(page.getByTestId('site-aggregate-label')).toBeVisible({ timeout: 15000 });
        // Screenshot the sidebar panel only — full-page includes the map canvas
        // which renders non-deterministically (tile loading order, GPU rasterisation).
        const panel = page.getByTestId('appshell-sidebar-panel');
        await expect(panel).toHaveScreenshot(`marine-domain-${theme}-${site}.png`, {
          maxDiffPixelRatio: 0.01,
        });
      });
    }
  }
});
