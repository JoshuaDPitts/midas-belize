import { test, expect } from '@playwright/test'

/**
 * Data Layer Stage 1 — API-only smoke. The visual-regression test for the
 * `/test-data-layer` smoke page was retired in LS-016 alongside the page
 * itself; the data layer is now covered by 132 integration tests (Firestore
 * + Storage emulators) plus the admin dashboard e2e at /admin/data. The two
 * GET assertions below stay because they exercise the production API
 * endpoints directly (no rendered page required).
 */
test.describe('Data Layer Stage 1', () => {
  test('GET /api/data/placencia-site returns bytes + provenance + cache headers', async ({
    request,
  }) => {
    const res = await request.get('/api/data/placencia-site')
    expect(res.status()).toBe(200)
    const headers = res.headers()
    expect(headers['x-dataset-source']).toBeTruthy()
    expect(headers['x-dataset-license']).toBeTruthy()
    expect(headers['x-dataset-citation']).toBeTruthy()
    expect(headers['x-dataset-version']).toMatch(/^v\d{4}-\d{2}-\d{2}-[0-9a-f]{7}$/)
    expect(headers['cache-control']).toBe('public, max-age=31536000, immutable')
  })

  test('GET /api/layers/placencia lists placencia-site as a visible layer', async ({
    request,
  }) => {
    const res = await request.get('/api/layers/placencia')
    expect(res.status()).toBe(200)
    const body = (await res.json()) as { layers: Array<{ id: string }> }
    const ids = body.layers.map((l) => l.id)
    expect(ids).toContain('placencia-site')
  })
})
