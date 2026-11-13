import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import {
  pollDriveOnce,
  dispatchGithub,
  type DriveClient,
} from '../../../scripts/pre-process/drive-poller'

process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST ?? 'localhost:8080'

function mockClient(overrides: Partial<DriveClient['changes']> = {}): DriveClient {
  return {
    changes: {
      getStartPageToken: vi
        .fn()
        .mockResolvedValue({ data: { startPageToken: 'token-100' } }),
      list: vi
        .fn()
        .mockResolvedValue({ data: { changes: [], newStartPageToken: 'token-100' } }),
      ...overrides,
    },
  }
}

describe('pollDriveOnce', () => {
  beforeAll(() => {
    if (getApps().length === 0) initializeApp({ projectId: 'midas-test' })
  })

  beforeEach(async () => {
    const snap = await getFirestore().collection('drive_state').get()
    for (const d of snap.docs) await d.ref.delete()
  })

  it('on first poll fetches startPageToken via drive API + persists to drive_state', async () => {
    const client = mockClient()
    const result = await pollDriveOnce({
      folderId: 'folder-1',
      driveClient: client,
      minIntervalMs: 0,
    })
    expect(result.initialized).toBe(true)
    expect(result.changedPaths).toEqual([])
    expect(client.changes.getStartPageToken).toHaveBeenCalled()

    const state = await getFirestore().collection('drive_state').doc('folder-1').get()
    expect(state.data()?.startPageToken).toBe('token-100')
  })

  it('returns changedPaths when changes.list reports changes', async () => {
    await getFirestore().collection('drive_state').doc('folder-2').set({
      startPageToken: 'token-5',
      last_poll_at: Timestamp.fromMillis(Date.now() - 60_000),
    })
    const client = mockClient({
      list: vi.fn().mockResolvedValue({
        data: {
          changes: [
            {
              file: { id: 'f1', name: 'a.csv', mimeType: 'text/csv' },
              removed: false,
            },
            {
              file: { id: 'f2', name: 'b.shp', mimeType: 'application/octet-stream' },
              removed: false,
            },
          ],
          newStartPageToken: 'token-6',
        },
      }),
    })
    const result = await pollDriveOnce({
      folderId: 'folder-2',
      driveClient: client,
      minIntervalMs: 0,
    })
    expect(result.initialized).toBe(false)
    expect(result.changedPaths).toHaveLength(2)
    expect(result.changedPaths[0]).toEqual({
      fileId: 'f1',
      name: 'a.csv',
      mimeType: 'text/csv',
      removed: false,
    })

    const state = await getFirestore().collection('drive_state').doc('folder-2').get()
    expect(state.data()?.startPageToken).toBe('token-6')
  })

  it('respects the rate-limit window (claimNextPoll returns claimed=false)', async () => {
    await getFirestore().collection('drive_state').doc('folder-3').set({
      startPageToken: 'token-7',
      last_poll_at: Timestamp.now(),
    })
    const client = mockClient()
    const result = await pollDriveOnce({
      folderId: 'folder-3',
      driveClient: client,
      minIntervalMs: 60_000,
    })
    expect(result.initialized).toBe(false)
    expect(result.changedPaths).toEqual([])
    expect(client.changes.list).not.toHaveBeenCalled()
    expect(client.changes.getStartPageToken).not.toHaveBeenCalled()
  })

  it('filters out change entries with no file attached (removed items without file metadata)', async () => {
    await getFirestore().collection('drive_state').doc('folder-4').set({
      startPageToken: 'token-8',
      last_poll_at: Timestamp.fromMillis(Date.now() - 60_000),
    })
    const client = mockClient({
      list: vi.fn().mockResolvedValue({
        data: {
          changes: [
            { file: null, removed: true },
            {
              file: { id: 'f1', name: 'a.csv', mimeType: 'text/csv' },
              removed: false,
            },
          ],
          newStartPageToken: 'token-9',
        },
      }),
    })
    const result = await pollDriveOnce({
      folderId: 'folder-4',
      driveClient: client,
      minIntervalMs: 0,
    })
    expect(result.changedPaths).toHaveLength(1)
    expect(result.changedPaths[0].fileId).toBe('f1')
  })

  it('throws when Drive API returns no startPageToken on first poll', async () => {
    const client = mockClient({
      getStartPageToken: vi.fn().mockResolvedValue({ data: {} }),
    })
    await expect(
      pollDriveOnce({ folderId: 'folder-5', driveClient: client, minIntervalMs: 0 }),
    ).rejects.toThrow(/no startPageToken/)
  })

  it('forwards driveId to Drive API calls when set (Shared Drive scoping)', async () => {
    await getFirestore().collection('drive_state').doc('drive-abc').set({
      startPageToken: 'tok-10',
      last_poll_at: Timestamp.fromMillis(Date.now() - 60_000),
    })
    const list = vi.fn().mockResolvedValue({
      data: { changes: [], newStartPageToken: 'tok-11' },
    })
    const client = mockClient({ list })
    await pollDriveOnce({
      folderId: 'drive-abc',
      driveId: 'drive-abc',
      driveClient: client,
      minIntervalMs: 0,
    })
    expect(list).toHaveBeenCalledWith(
      expect.objectContaining({
        pageToken: 'tok-10',
        driveId: 'drive-abc',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      }),
    )
  })

  it('forwards driveId to getStartPageToken on first poll for a Shared Drive', async () => {
    const getStartPageToken = vi
      .fn()
      .mockResolvedValue({ data: { startPageToken: 'tok-init' } })
    const client = mockClient({ getStartPageToken })
    await pollDriveOnce({
      folderId: 'drive-xyz',
      driveId: 'drive-xyz',
      driveClient: client,
      minIntervalMs: 0,
    })
    expect(getStartPageToken).toHaveBeenCalledWith(
      expect.objectContaining({ driveId: 'drive-xyz', supportsAllDrives: true }),
    )
  })
})

describe('dispatchGithub', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.GITHUB_DISPATCH_TOKEN = 'abc'
    process.env.GITHUB_REPO_OWNER = 'midas'
    process.env.GITHUB_REPO_NAME = 'belize'
  })

  it('POSTs repository_dispatch with the given payload + default event_type preprocess', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))

    await dispatchGithub({ changedFiles: ['a.csv', 'b.shp'] })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.github.com/repos/midas/belize/dispatches',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer abc',
        }),
      }),
    )
    const init = fetchSpy.mock.calls[0][1] as { body?: string }
    const body = JSON.parse(init.body ?? '{}')
    expect(body).toEqual({
      event_type: 'preprocess',
      client_payload: { changed_files: ['a.csv', 'b.shp'] },
    })
  })

  it('honors a custom eventType', async () => {
    const fetchSpy = vi
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }))
    await dispatchGithub({ changedFiles: [], eventType: 'rerun' })
    const init = fetchSpy.mock.calls[0][1] as { body?: string }
    const body = JSON.parse(init.body ?? '{}')
    expect(body.event_type).toBe('rerun')
  })

  it('throws on non-ok response', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'forbidden' }), { status: 403 }),
    )
    await expect(dispatchGithub({ changedFiles: [] })).rejects.toThrow(/403/)
  })

  it('throws when env vars are missing', async () => {
    delete process.env.GITHUB_DISPATCH_TOKEN
    await expect(dispatchGithub({ changedFiles: [] })).rejects.toThrow(/env vars missing/)
  })
})
