#!/usr/bin/env bash
#
# One-time setup for Stage 3 Cloud Functions in midas-belize-prod.
#
# Creates the drive-poller GCP service account, wires it with Drive
# readonly access, generates a key, and stores all Function secrets
# in Google Secret Manager via the firebase CLI.
#
# Prerequisites (do these once, interactively):
#   1. gcloud auth login                  # as a project Owner/Editor
#   2. gcloud config set project midas-belize-prod
#   3. firebase login                     # same identity
#
# External actions that STILL require a human (the script prompts for
# these values — they can't be scripted away):
#   • Create a GitHub PAT with repo + workflow scope for repository_dispatch.
#     https://github.com/settings/personal-access-tokens
#   • Create a Slack Incoming Webhook for the #midas-alerts channel.
#     https://api.slack.com/apps → Incoming Webhooks
#   • For each Shared Drive in DRIVE_SA_FOLDER_IDS: open the drive in
#     drive.google.com → Manage members → add the drive-poller service
#     account (email printed at the end of this script) with role
#     "Content manager" or lower. Shared Drives use membership, not
#     folder-level sharing.
#   • For drives in DRIVE_OAUTH_FOLDER_IDS (drives the user can't add
#     a service account to): create a Desktop OAuth client in GCP
#     Console (APIs & Services → Credentials), then run
#       pnpm drive:consent
#     to capture a refresh token. The OAuth path is for personal
#     Gmail access where service-account membership isn't possible.
#     NOTE: refresh tokens for OAuth apps in "Testing" status expire
#     after 7 days. driveWatcher detects expiry and posts a Slack
#     alert with the recovery command.
#
# Re-runnable — existing service accounts / secrets are skipped.

set -euo pipefail

PROJECT="midas-belize-prod"
SA_NAME="drive-poller"
SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"
KEY_OUT="$(mktemp -d)/drive-poller-key.json"
REGION="us-central1"

log() { printf '\n==> %s\n' "$*"; }

# --- Identity check --------------------------------------------------
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null || true)
if [[ -z "${ACTIVE_ACCOUNT}" ]]; then
  echo "ERROR: gcloud is not authenticated. Run: gcloud auth login" >&2
  exit 1
fi
log "gcloud identity: ${ACTIVE_ACCOUNT}"
gcloud config set project "${PROJECT}"

# --- Enable required APIs -------------------------------------------
log "Enabling required APIs (idempotent)"
gcloud services enable \
  drive.googleapis.com \
  secretmanager.googleapis.com \
  cloudfunctions.googleapis.com \
  cloudbuild.googleapis.com \
  cloudscheduler.googleapis.com \
  --project "${PROJECT}"

# --- Service account ------------------------------------------------
if gcloud iam service-accounts describe "${SA_EMAIL}" --project "${PROJECT}" >/dev/null 2>&1; then
  log "Service account ${SA_EMAIL} already exists"
else
  log "Creating service account ${SA_EMAIL}"
  gcloud iam service-accounts create "${SA_NAME}" \
    --display-name="Midas Drive poller" \
    --description="Read-only Drive access for the driveWatcher Cloud Function" \
    --project "${PROJECT}"
fi

# --- Service account key --------------------------------------------
log "Generating a fresh key for ${SA_EMAIL}"
gcloud iam service-accounts keys create "${KEY_OUT}" \
  --iam-account="${SA_EMAIL}" \
  --project "${PROJECT}"

DRIVE_KEY_B64=$(base64 < "${KEY_OUT}" | tr -d '\n')

# --- Secrets --------------------------------------------------------
# Firebase functions:secrets:set writes to Google Secret Manager and
# automatically grants the default Functions runtime access on deploy.

set_secret() {
  local name="$1" value="$2"
  printf '%s' "${value}" \
    | firebase functions:secrets:set "${name}" \
        --project "${PROJECT}" \
        --data-file -
}

log "Storing DRIVE_SERVICE_ACCOUNT_KEY"
set_secret DRIVE_SERVICE_ACCOUNT_KEY "${DRIVE_KEY_B64}"

# --- Service-account-reachable drives -----------------------------
log "DRIVE_SA_FOLDER_IDS — comma-separated Shared Drive IDs you'll add ${SA_EMAIL} to."
log "  Leave empty if you have no service-account-reachable drives."
read -r DRIVE_SA_FOLDER_IDS
DRIVE_SA_FOLDER_IDS="${DRIVE_SA_FOLDER_IDS:-}"
set_secret DRIVE_SA_FOLDER_IDS "${DRIVE_SA_FOLDER_IDS}"

# --- OAuth-user-reachable drives ----------------------------------
log "DRIVE_OAUTH_FOLDER_IDS — comma-separated Shared Drive IDs reachable only via your"
log "  personal Google account (ones you can't add a service account to)."
log "  Leave empty if all drives are SA-reachable."
read -r DRIVE_OAUTH_FOLDER_IDS
DRIVE_OAUTH_FOLDER_IDS="${DRIVE_OAUTH_FOLDER_IDS:-}"
set_secret DRIVE_OAUTH_FOLDER_IDS "${DRIVE_OAUTH_FOLDER_IDS}"

if [[ -n "${DRIVE_OAUTH_FOLDER_IDS}" ]]; then
  log "DRIVE_OAUTH_CLIENT_ID — paste the Desktop OAuth client ID from GCP Console:"
  read -r DRIVE_OAUTH_CLIENT_ID
  set_secret DRIVE_OAUTH_CLIENT_ID "${DRIVE_OAUTH_CLIENT_ID}"

  log "DRIVE_OAUTH_CLIENT_SECRET — paste the matching Client Secret:"
  read -rs DRIVE_OAUTH_CLIENT_SECRET; echo
  set_secret DRIVE_OAUTH_CLIENT_SECRET "${DRIVE_OAUTH_CLIENT_SECRET}"

  log "DRIVE_OAUTH_REFRESH_TOKEN — paste the refresh token printed by 'pnpm drive:consent':"
  read -rs DRIVE_OAUTH_REFRESH_TOKEN; echo
  set_secret DRIVE_OAUTH_REFRESH_TOKEN "${DRIVE_OAUTH_REFRESH_TOKEN}"
fi

log "GITHUB_DISPATCH_TOKEN — paste a GitHub PAT with repo + workflow scope:"
read -rs GITHUB_DISPATCH_TOKEN; echo
set_secret GITHUB_DISPATCH_TOKEN "${GITHUB_DISPATCH_TOKEN}"

log "SLACK_ALERT_WEBHOOK — paste the Slack Incoming Webhook URL:"
read -rs SLACK_ALERT_WEBHOOK; echo
set_secret SLACK_ALERT_WEBHOOK "${SLACK_ALERT_WEBHOOK}"

# --- Non-secret params ----------------------------------------------
log "GITHUB_REPO_OWNER + GITHUB_REPO_NAME (public, stored as Function params, not secrets):"
read -r -p "GITHUB_REPO_OWNER: " GITHUB_REPO_OWNER
read -r -p "GITHUB_REPO_NAME: " GITHUB_REPO_NAME

PARAMS_FILE="$(dirname "$0")/../.env.midas-belize-prod"
cat > "${PARAMS_FILE}" <<EOF
GITHUB_REPO_OWNER=${GITHUB_REPO_OWNER}
GITHUB_REPO_NAME=${GITHUB_REPO_NAME}
EOF
log "Wrote non-secret params to ${PARAMS_FILE} (picked up by firebase deploy)"

# --- Cleanup --------------------------------------------------------
shred -u "${KEY_OUT}" 2>/dev/null || rm -f "${KEY_OUT}"

cat <<EOF

Done. Next actions (human-only):

  1. For each Shared Drive listed in DRIVE_SA_FOLDER_IDS:
     Open drive.google.com → the drive → Manage members → add
       ${SA_EMAIL}
     Role: Content manager (or Viewer if you prefer read-only).
     NOTE: Shared Drives use membership, not folder-level sharing.

  2. From functions/: pnpm deploy

The Function runtime will pick up secrets automatically on next invocation.

If OAuth refresh fails later (7-day expiry on Testing-status apps),
driveWatcher will Slack-alert with a one-line recovery command.
EOF
