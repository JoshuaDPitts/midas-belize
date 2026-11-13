import { claimNextPoll, updatePollResult } from './drive-state'

/**
 * Minimal interface for the subset of googleapis drive_v3.Drive we
 * actually use. Keeps the pure logic testable without pulling in the
 * ~40MB googleapis package as a root dependency.
 *
 * At deploy time, `functions/src/drive-watcher.ts` constructs a real
 * drive_v3.Drive from `google.drive({ version: 'v3', auth })` and
 * passes it in.
 */
export interface DriveClient {
  changes: {
    getStartPageToken: (opts: {
      driveId?: string
      supportsAllDrives?: boolean
    }) => Promise<{ data: { startPageToken?: string | null } }>
    list: (opts: {
      pageToken: string
      driveId?: string
      fields?: string
      pageSize?: number
      supportsAllDrives?: boolean
      includeItemsFromAllDrives?: boolean
    }) => Promise<{
      data: {
        changes?: Array<{
          file?: {
            id?: string | null
            name?: string | null
            mimeType?: string | null
            parents?: string[] | null
          } | null
          removed?: boolean | null
        }>
        newStartPageToken?: string | null
      }
    }>
  }
}

export interface ChangedPath {
  fileId: string
  name: string
  mimeType: string
  removed: boolean
}

export interface PollResult {
  initialized: boolean
  changedPaths: ChangedPath[]
}

export interface PollOpts {
  // Opaque state key used to store/retrieve the Drive page token. For
  // multi-drive deployments the caller passes each Shared Drive's ID
  // here so every drive keeps its own independent cursor.
  folderId: string
  // When set, scopes the Drive API calls to a specific Shared Drive —
  // `changes.getStartPageToken` + `changes.list` both accept a
  // `driveId`. Leave undefined for My-Drive-only polling.
  driveId?: string
  driveClient: DriveClient
  minIntervalMs?: number
}

export async function pollDriveOnce(opts: PollOpts): Promise<PollResult> {
  const { folderId, driveId, driveClient } = opts
  const minIntervalMs = opts.minIntervalMs ?? 10 * 60 * 1000

  const claim = await claimNextPoll(folderId, minIntervalMs)
  if (!claim.claimed) {
    // Another process is polling (or the window is still open).
    return { initialized: false, changedPaths: [] }
  }

  if (!claim.startPageToken) {
    // First poll — fetch and persist the initial token.
    const res = await driveClient.changes.getStartPageToken({
      driveId,
      supportsAllDrives: true,
    })
    const token = res.data.startPageToken
    if (!token) {
      throw new Error('drive-poller: Drive API returned no startPageToken')
    }
    await updatePollResult(folderId, token)
    return { initialized: true, changedPaths: [] }
  }

  const res = await driveClient.changes.list({
    pageToken: claim.startPageToken,
    driveId,
    fields: 'changes(file(id,name,mimeType,parents),removed),newStartPageToken',
    pageSize: 1000,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  })

  const changes = res.data.changes ?? []
  const changedPaths: ChangedPath[] = changes
    .filter((c) => c.file)
    .map((c) => ({
      fileId: c.file!.id ?? '',
      name: c.file!.name ?? '',
      mimeType: c.file!.mimeType ?? '',
      removed: !!c.removed,
    }))

  const newToken = res.data.newStartPageToken ?? claim.startPageToken
  await updatePollResult(folderId, newToken)
  return { initialized: false, changedPaths }
}

export interface DispatchOpts {
  changedFiles: string[]
  eventType?: string
}

export async function dispatchGithub(opts: DispatchOpts): Promise<void> {
  const token = process.env.GITHUB_DISPATCH_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!token || !owner || !repo) {
    throw new Error(
      'GitHub dispatch env vars missing (need GITHUB_DISPATCH_TOKEN, GITHUB_REPO_OWNER, GITHUB_REPO_NAME)',
    )
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: opts.eventType ?? 'preprocess',
        client_payload: { changed_files: opts.changedFiles },
      }),
    },
  )
  if (!res.ok && res.status !== 204) {
    throw new Error(`GitHub dispatch failed: ${res.status}`)
  }
}
