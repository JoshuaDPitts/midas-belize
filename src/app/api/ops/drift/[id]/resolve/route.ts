import { NextRequest, NextResponse } from 'next/server'
import { Timestamp } from 'firebase-admin/firestore'
import { db } from '@/lib/data/firebase-admin'
import { withRouteHandler } from '@/app/api/_lib/withRouteHandler'
import {
  NotFoundError,
  RateLimitError,
  UpstreamError,
  ValidationError,
} from '@/app/api/_lib/errors'
import { checkRateLimit } from '@/app/api/_lib/rateLimit'
import type { SchemaDrift } from '@/lib/data/types'

const RATE_OPTS = { bucketSize: 10, windowMs: 60 * 60 * 1000 }
const STATUS_MAP = {
  accept: 'accepted',
  reject: 'rejected',
  defer: 'deferred',
} as const
type ResolveAction = keyof typeof STATUS_MAP

interface ResolveBody {
  action?: string
  notes?: string
  new_schema_code?: string
}

interface GithubFileRes {
  content: string
  sha: string
}
interface GithubRefRes {
  object: { sha: string }
}
interface GithubCommitRes {
  commit: { sha: string }
}

export const POST = withRouteHandler<{ id: string }>(async (req: NextRequest, ctx) => {
  const rl = await checkRateLimit(req, RATE_OPTS)
  if (!rl.allowed) throw new RateLimitError('drift-resolve quota exceeded', rl.retryAfter)

  const body = (await req.json().catch(() => ({}))) as ResolveBody
  const action = body.action
  if (!action || !(action in STATUS_MAP)) {
    throw new ValidationError('action must be one of: accept, reject, defer')
  }

  const { id } = await ctx.params
  const ref = db.collection('schema_drift').doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new NotFoundError(`drift ticket ${id} not found`)

  const ticket = snap.data() as SchemaDrift
  let resolutionCommitSha: string | null = null

  if (action === 'accept') {
    if (!body.new_schema_code || body.new_schema_code.trim().length === 0) {
      throw new ValidationError('new_schema_code is required when action=accept')
    }
    resolutionCommitSha = await openSchemaBumpPR(ticket, body.new_schema_code)
  }

  const newStatus = STATUS_MAP[action as ResolveAction]
  await ref.update({
    status: newStatus,
    resolved_at: Timestamp.now(),
    resolution_notes: body.notes ?? null,
    resolution_commit_sha: resolutionCommitSha,
  })

  return NextResponse.json(
    {
      ok: true,
      status: newStatus,
      pr_commit_sha: resolutionCommitSha,
    },
    { headers: { 'Cache-Control': 'no-cache' } },
  )
})

/**
 * Open a schema-bump PR on GitHub: fetches main HEAD, creates a branch
 * (idempotent — 422 "already exists" is silently absorbed), reads the
 * existing schema file from the branch, regex-splices the new map() and
 * bumped schemaVersion, commits, opens the PR, and returns the commit SHA.
 *
 * Each network step throws UpstreamError with a descriptive prefix so
 * the route handler's withRouteHandler can surface a 502 to the client.
 */
async function openSchemaBumpPR(
  ticket: SchemaDrift,
  newSchemaCode: string,
): Promise<string> {
  const token = process.env.GITHUB_DISPATCH_TOKEN
  const owner = process.env.GITHUB_REPO_OWNER
  const repo = process.env.GITHUB_REPO_NAME
  if (!token || !owner || !repo) {
    throw new UpstreamError('GitHub credentials not configured')
  }

  const baseHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  } as const

  const repoBase = `https://api.github.com/repos/${owner}/${repo}`
  const bumpedVersion = ticket.current_schema_version + 1
  const branch = `schema-bump/${ticket.schema_id}-v${bumpedVersion}`

  // 1. Get main HEAD ref.
  const headRes = await fetch(`${repoBase}/git/refs/heads/main`, { headers: baseHeaders })
  if (!headRes.ok) {
    throw new UpstreamError(`GitHub refs/heads/main fetch failed (${headRes.status})`)
  }
  const headData = (await headRes.json()) as GithubRefRes
  const baseSha = headData.object.sha

  // 2. Create branch (idempotent — 422 means it already exists).
  const branchRes = await fetch(`${repoBase}/git/refs`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  })
  if (!branchRes.ok && branchRes.status !== 422) {
    throw new UpstreamError(`GitHub branch create failed (${branchRes.status})`)
  }

  // 3. Fetch current schema file from the branch.
  const path = `scripts/pre-process/schemas/${ticket.schema_id}.ts`
  const fileRes = await fetch(`${repoBase}/contents/${path}?ref=${branch}`, {
    headers: baseHeaders,
  })
  if (!fileRes.ok) {
    throw new UpstreamError(`GitHub schema file fetch failed (${fileRes.status})`)
  }
  const fileData = (await fileRes.json()) as GithubFileRes
  const currentContent = Buffer.from(fileData.content, 'base64').toString('utf-8')

  // 4. Bump schemaVersion + splice the new map() function.
  // The regex is intentionally permissive — it matches `map(row) { ... }` or
  // `map(...) { ... }` up to the matching brace assuming sane formatting.
  // Schemas that hand-write multi-paragraph map() bodies should review the
  // PR before merging.
  const newContent = currentContent
    .replace(/schemaVersion:\s*\d+/, `schemaVersion: ${bumpedVersion}`)
    .replace(/map\s*\([^)]*\)\s*\{[\s\S]*?\n\s*\}/, newSchemaCode.trim())

  // 5. Commit the new content.
  const commitRes = await fetch(`${repoBase}/contents/${path}`, {
    method: 'PUT',
    headers: baseHeaders,
    body: JSON.stringify({
      message: `feat(data-layer): bump ${ticket.schema_id} schemaVersion → ${bumpedVersion}`,
      content: Buffer.from(newContent, 'utf-8').toString('base64'),
      sha: fileData.sha,
      branch,
    }),
  })
  if (!commitRes.ok) {
    throw new UpstreamError(`GitHub commit failed (${commitRes.status})`)
  }
  const commitData = (await commitRes.json()) as GithubCommitRes

  // 6. Open the pull request.
  const prRes = await fetch(`${repoBase}/pulls`, {
    method: 'POST',
    headers: baseHeaders,
    body: JSON.stringify({
      title: `Schema bump: ${ticket.schema_id} v${bumpedVersion}`,
      head: branch,
      base: 'main',
      body: `Auto-generated from drift ticket.\n\nMissing required: \`${
        ticket.diff.missing_required.join(', ') || '(none)'
      }\`\nUnknown added: \`${
        ticket.diff.added_unknown.join(', ') || '(none)'
      }\`\n\nReview the new \`map()\` before merging.`,
    }),
  })
  if (!prRes.ok) {
    throw new UpstreamError(`GitHub PR create failed (${prRes.status})`)
  }

  return commitData.commit.sha
}
