import { describe, it, expect, vi } from 'vitest'
import {
  buildSlackMessage,
  shouldAlert,
  sendSlackAlert,
} from '@/../scripts/pre-process/alert-on-failure'
import type { PipelineRun } from '@/lib/data/types'
import { Timestamp } from 'firebase-admin/firestore'

function run(overrides: Partial<PipelineRun> = {}): PipelineRun {
  return {
    triggered_by: 'drive-change',
    started_at: Timestamp.now(),
    status: 'failed',
    github_run_url: 'https://github.com/midas/belize/actions/runs/1',
    summary: {
      datasets_total: 5,
      datasets_published: 0,
      datasets_skipped_nochange: 0,
      datasets_blocked_by_drift: 3,
      datasets_failed: 2,
      discovered_files_new: 0,
      schema_drift_opened: 3,
    },
    dataset_outcomes: [],
    drift_opened: [],
    discovered_new: [],
    error_summary: 'converter threw on file X',
    ...overrides,
  }
}

describe('buildSlackMessage', () => {
  it('summarizes a failed run with counts + drift mention + GH link', () => {
    const msg = buildSlackMessage('run-1', run())
    expect(msg.text).toContain('run-1')
    expect(msg.text).toContain('failed')
    expect(msg.text).toContain('drive-change')
    expect(msg.text).toContain('3 blocked by drift')
    expect(msg.text).toContain('🧬 3 new schema drift')
    expect(msg.text).toContain('View GitHub Actions log')
    expect(msg.text).toContain('converter threw on file X')
    expect(msg.blocks?.[0]).toMatchObject({ type: 'section' })
  })

  it('omits the drift and discovered lines when counts are zero', () => {
    const r = run({
      summary: {
        datasets_total: 2,
        datasets_published: 0,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 2,
        discovered_files_new: 0,
        schema_drift_opened: 0,
      },
    })
    const msg = buildSlackMessage('run-2', r)
    expect(msg.text).not.toContain('schema drift')
    expect(msg.text).not.toContain('unrecognized file')
  })

  it('mentions discovered files when count > 0', () => {
    const r = run({
      summary: {
        datasets_total: 1,
        datasets_published: 0,
        datasets_skipped_nochange: 0,
        datasets_blocked_by_drift: 0,
        datasets_failed: 1,
        discovered_files_new: 7,
        schema_drift_opened: 0,
      },
    })
    const msg = buildSlackMessage('run-3', r)
    expect(msg.text).toContain('🔍 7 unrecognized file(s)')
  })

  it('omits the error_summary line when absent', () => {
    const r = run({ error_summary: undefined })
    const msg = buildSlackMessage('run-4', r)
    expect(msg.text).not.toContain('• Error:')
  })
})

describe('shouldAlert', () => {
  it('fires on transition non-failed → failed', () => {
    expect(shouldAlert({ before: { status: 'running' }, after: { status: 'failed' } })).toBe(
      true,
    )
  })

  it('fires on first-time failed (no before doc)', () => {
    expect(shouldAlert({ before: null, after: { status: 'failed' } })).toBe(true)
  })

  it('does not fire when already failed (dedup)', () => {
    expect(shouldAlert({ before: { status: 'failed' }, after: { status: 'failed' } })).toBe(
      false,
    )
  })

  it('does not fire on success → failed transition blocked — wait, that should fire', () => {
    // 'failed' transition from any non-failed state triggers an alert.
    expect(shouldAlert({ before: { status: 'success' }, after: { status: 'failed' } })).toBe(
      true,
    )
  })

  it('does not fire when after is not failed', () => {
    expect(shouldAlert({ before: { status: 'running' }, after: { status: 'success' } })).toBe(
      false,
    )
    expect(shouldAlert({ before: { status: 'running' }, after: { status: 'partial' } })).toBe(
      false,
    )
  })

  it('does not fire on delete (after is null)', () => {
    expect(shouldAlert({ before: { status: 'failed' }, after: null })).toBe(false)
  })
})

describe('sendSlackAlert', () => {
  it('POSTs the message to the webhook URL', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    await sendSlackAlert({
      webhookUrl: 'https://hooks.slack.com/services/abc',
      message: { text: 'hello' },
      fetchImpl: fetchSpy as never,
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://hooks.slack.com/services/abc',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    const init = fetchSpy.mock.calls[0][1] as { body: string }
    expect(JSON.parse(init.body)).toEqual({ text: 'hello' })
  })

  it('throws on non-ok response', async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 500 }))
    await expect(
      sendSlackAlert({
        webhookUrl: 'https://hooks.slack.com/services/abc',
        message: { text: 'x' },
        fetchImpl: fetchSpy as never,
      }),
    ).rejects.toThrow(/500/)
  })
})
