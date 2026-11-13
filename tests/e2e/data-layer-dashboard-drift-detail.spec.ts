import { test, expect, type Page } from '@playwright/test';

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const TICKET_ID = 'drift-mimes-polygon-detail-aabbcc';

interface FakeTicket {
  id: string;
  schema_id: string;
  current_schema_version: number;
  detected_at: { _seconds: number };
  first_seen_in_run: string;
  last_seen_in_run: string;
  occurrence_count: number;
  diff: {
    missing_required: string[];
    added_unknown: string[];
    renamed_candidates: Array<{ from: string; to: string; confidence: number }>;
    dropped_dynamic: string[];
  };
  affected_datasets: string[];
  sample_rows: Record<string, unknown>[];
  source_file_path: string;
  status: 'open' | 'accepted' | 'rejected' | 'deferred' | 'superseded';
  resolved_at?: { _seconds: number };
  resolution_notes?: string;
  resolution_commit_sha?: string;
}

function makeFixture(): FakeTicket {
  const nowMs = Date.now();
  const sec = (offset: number) => Math.floor((nowMs - offset) / 1000);
  return {
    id: TICKET_ID,
    schema_id: 'mimes-polygon-detail',
    current_schema_version: 1,
    detected_at: { _seconds: sec(2 * HOUR) },
    first_seen_in_run: 'drive-1745619600-eeff0011',
    last_seen_in_run: 'drive-1745619600-eeff0011',
    occurrence_count: 1,
    diff: {
      missing_required: ['Polygon_ID', 'BIN_Label'],
      added_unknown: ['New_Mystery_Column'],
      renamed_candidates: [{ from: 'BIN_ID', to: 'BinId', confidence: 0.87 }],
      dropped_dynamic: ['Clade_5_pct'],
    },
    affected_datasets: [
      'cayecaulker-mimes-ebin-clade-detail',
      'cayecaulker-mimes-nbs-scores',
    ],
    sample_rows: [
      { Polygon_ID: 1, BIN_ID: 7, BIN_Label: 'BIN-A', Clade_1_pct: 0.42 },
      { Polygon_ID: 2, BIN_ID: 9, BIN_Label: 'BIN-B', Clade_1_pct: 0.18, New_Mystery_Column: 'extra' },
      { Polygon_ID: 3, BIN_ID: 11, BIN_Label: 'BIN-C', Clade_1_pct: null },
    ],
    source_file_path:
      'reference/MIMES_MIDAS/Processed Output/Cayecaulker_mimes_ebin_clade_detail.csv',
    status: 'open',
  };
}

async function mockOps(page: Page, ticket: FakeTicket) {
  // Stub the layout's FreshnessBanner data sources so the baseline
  // doesn't depend on prod catalog freshness.
  await page.route('**/api/ops/datasets', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ datasets: [] }),
    }),
  );
  await page.route('**/api/ops/runs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ runs: [] }),
    }),
  );
  await page.route(`**/api/ops/drift/${TICKET_ID}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ drift: ticket }),
    }),
  );
}

// Visual baselines moved to tests/e2e/data-layer-dashboard.spec.ts (DL-049).

test.describe('Dashboard · Drift detail (DL-043)', () => {
  test.setTimeout(60_000);

  test('back link returns to drift queue', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');
    await page.getByRole('link', { name: '← Drift queue' }).click();
    await page.waitForURL('**/admin/data/drift');
  });

  test('all 3 diff blocks + renames render', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');
    await expect(page.locator('[data-diff-block="error"]')).toBeVisible();
    await expect(page.locator('[data-diff-block="warn"]')).toBeVisible();
    await expect(page.locator('[data-diff-block="muted"]')).toBeVisible();
    await expect(page.locator('[data-renames]')).toBeVisible();
  });

  test('Accept button is disabled until the snippet is valid; clicking calls /resolve and shows success banner', async ({
    page,
  }) => {
    await mockOps(page, makeFixture());
    await page.route(`**/api/ops/drift/${TICKET_ID}/resolve`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          status: 'accepted',
          pr_commit_sha: 'abcdef1234567890',
        }),
      }),
    );
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');

    const acceptBtn = page.locator('[data-action="accept"]');
    // Default template has return + map, so it's valid → button enabled.
    await expect(acceptBtn).toBeEnabled();

    // Type something that breaks validation (no return).
    const editor = page.getByLabel('New schema map() snippet');
    await editor.fill('not a snippet');
    await expect(acceptBtn).toBeDisabled();

    // Restore a valid snippet.
    await editor.fill('map(row) { return row; }');
    await expect(acceptBtn).toBeEnabled();

    await acceptBtn.click();
    const success = page.locator('[data-resolve-success]');
    await expect(success).toContainText('Accepted');
    await expect(success).toContainText('abcdef1');
  });

  test('Defer button calls /resolve with action=defer and shows success', async ({ page }) => {
    await mockOps(page, makeFixture());
    let lastBody: { action?: string } | null = null;
    await page.route(`**/api/ops/drift/${TICKET_ID}/resolve`, async (route) => {
      lastBody = JSON.parse(route.request().postData() ?? '{}');
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, status: 'deferred', pr_commit_sha: null }),
      });
    });
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');
    await page.locator('[data-action="defer"]').click();
    await expect(page.locator('[data-resolve-success]')).toContainText('Deferred');
    expect(lastBody!.action).toBe('defer');
  });

  test('429 surfaces a rate-limit alert and disables all action buttons', async ({ page }) => {
    await mockOps(page, makeFixture());
    await page.route(`**/api/ops/drift/${TICKET_ID}/resolve`, (route) =>
      route.fulfill({
        status: 429,
        headers: { 'Retry-After': '180' },
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'quota exceeded' } }),
      }),
    );
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');
    await page.locator('[data-action="reject"]').click();
    const alert = page.locator('[data-rate-limit-alert]');
    await expect(alert).toContainText('Rate limit reached');
    await expect(alert).toContainText('3m');
    await expect(page.locator('[data-action="accept"]')).toBeDisabled();
    await expect(page.locator('[data-action="defer"]')).toBeDisabled();
    await expect(page.locator('[data-action="reject"]')).toBeDisabled();
  });

  test('resolved ticket shows the resolved banner and disables actions', async ({ page }) => {
    const ticket = makeFixture();
    ticket.status = 'accepted';
    ticket.resolved_at = { _seconds: Math.floor((Date.now() - 30 * 60 * 1000) / 1000) };
    ticket.resolution_notes = 'Approved after consultation with data owner.';
    ticket.resolution_commit_sha = '123abc456def';
    await mockOps(page, ticket);
    await page.goto(`/admin/data/drift/${TICKET_ID}`);
    await page.waitForSelector('[data-page="drift-detail"]:not([data-loading])');
    await expect(page.locator('[data-resolved-banner]')).toBeVisible();
    await expect(page.locator('[data-resolved-banner]')).toContainText('Approved after');
    await expect(page.locator('[data-action="accept"]')).toBeDisabled();
    await expect(page.locator('[data-action="defer"]')).toBeDisabled();
    await expect(page.locator('[data-action="reject"]')).toBeDisabled();
  });
});
