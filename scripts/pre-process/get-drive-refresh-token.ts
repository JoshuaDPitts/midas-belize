#!/usr/bin/env tsx
/**
 * One-shot OAuth consent flow for the driveWatcher Cloud Function's
 * user-delegated auth path (drives the service account can't be added
 * to). Exchanges an interactive consent for a refresh_token that the
 * Function then uses to mint short-lived access tokens.
 *
 * Run from repo root: `pnpm drive:consent`
 *
 * Prereqs (one-time, in GCP Console):
 *   1. Enable Drive API on the project.
 *   2. Configure the OAuth consent screen (External, Testing OK).
 *   3. Create an OAuth 2.0 Client ID, type = Desktop app.
 *
 * The script can read the Client ID + Secret either from the
 * downloaded `client_secret_*.json` (pass its path as --client-json)
 * or from interactive prompts.
 *
 * NOTE: Refresh tokens issued by an OAuth app in "Testing" status
 * expire after 7 days. The driveWatcher detects expiration and emits
 * a Slack alert with a recovery command — re-run this script and
 * update the DRIVE_OAUTH_REFRESH_TOKEN secret.
 */

import http from 'node:http'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'
import { OAuth2Client } from 'google-auth-library'

const CALLBACK_PORT = 8747
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}/callback`
const SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

interface ClientCreds {
  client_id: string
  client_secret: string
}

function parseClientJson(path: string): ClientCreds {
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as {
    installed?: ClientCreds
    web?: ClientCreds
  }
  const c = raw.installed ?? raw.web
  if (!c?.client_id || !c?.client_secret) {
    throw new Error(`Could not find client_id/client_secret in ${path}`)
  }
  return { client_id: c.client_id, client_secret: c.client_secret }
}

async function promptCreds(): Promise<ClientCreds> {
  const rl = readline.createInterface({ input, output })
  try {
    const client_id = (await rl.question('OAuth Client ID: ')).trim()
    const client_secret = (await rl.question('OAuth Client Secret: ')).trim()
    if (!client_id || !client_secret) throw new Error('client_id and client_secret required')
    return { client_id, client_secret }
  } finally {
    rl.close()
  }
}

function captureAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (!req.url) {
          res.writeHead(400)
          res.end('no url')
          return
        }
        const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`)
        if (url.pathname !== '/callback') {
          res.writeHead(404)
          res.end()
          return
        }
        const code = url.searchParams.get('code')
        const err = url.searchParams.get('error')
        if (err) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end(`OAuth error: ${err}. You can close this tab.`)
          server.close()
          reject(new Error(`OAuth error: ${err}`))
          return
        }
        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/plain' })
          res.end('no code in callback. You can close this tab.')
          server.close()
          reject(new Error('No auth code returned'))
          return
        }
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('Consent captured. You can close this tab and return to the terminal.')
        server.close()
        resolve(code)
      } catch (e) {
        try {
          res.writeHead(500)
          res.end()
        } catch {
          /* ignore */
        }
        server.close()
        reject(e as Error)
      }
    })
    server.listen(CALLBACK_PORT, () => {
      // ready
    })
    server.on('error', reject)
  })
}

async function main() {
  const args = process.argv.slice(2)
  const jsonFlag = args.indexOf('--client-json')
  let creds: ClientCreds
  if (jsonFlag !== -1 && args[jsonFlag + 1]) {
    creds = parseClientJson(args[jsonFlag + 1])
    console.log(`Loaded OAuth client from ${args[jsonFlag + 1]}`)
  } else {
    creds = await promptCreds()
  }

  const oauth = new OAuth2Client(creds.client_id, creds.client_secret, REDIRECT_URI)
  const authUrl = oauth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
  })

  console.log('\n1. Open this URL in your browser:\n')
  console.log(authUrl)
  console.log(
    '\n2. Click through the "unverified app" warning (Advanced → Go to ... unsafe).',
  )
  console.log('3. Consent to Drive readonly access.')
  console.log(
    `4. Google will redirect to ${REDIRECT_URI} — this script is listening.\n`,
  )
  console.log('Waiting for redirect...\n')

  const code = await captureAuthCode()
  const { tokens } = await oauth.getToken(code)
  if (!tokens.refresh_token) {
    throw new Error(
      'No refresh_token in response. Revoke prior consent at ' +
        'https://myaccount.google.com/permissions and re-run.',
    )
  }

  console.log('\n--- Refresh token (keep this, store in Secret Manager): ---\n')
  console.log(tokens.refresh_token)
  console.log('\n--- Next step ---')
  console.log('The setup script (functions/scripts/setup-prod-secrets.sh) will prompt for')
  console.log('this. Or store directly:')
  console.log(
    `  printf '%s' '${tokens.refresh_token}' | firebase functions:secrets:set DRIVE_OAUTH_REFRESH_TOKEN --project midas-belize-prod --data-file -`,
  )
}

main().catch((err) => {
  console.error('\nERROR:', err.message ?? err)
  process.exit(1)
})
