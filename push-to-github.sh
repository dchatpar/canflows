#!/usr/bin/env bash
# CanFlow.ai — Push to GitHub
# Usage: GITHUB_TOKEN=ghp_xxx GITHUB_REPO=your-org/canflow ./push-to-github.sh
#
# Required environment variables:
#   GITHUB_TOKEN   — Personal Access Token (PAT) with repo scope
#   GITHUB_REPO    — Target repo in "owner/repo" format (e.g. canflow-ai/canflow)
#
# Optional:
#   GITHUB_BRANCH  — Branch to push to (default: main)
#   COMMIT_MSG     — Commit message (default: "chore: sync from Hercules App Builder")

set -euo pipefail

# ── Validate inputs ────────────────────────────────────────────────────────────
if [[ -z "${GITHUB_TOKEN:-}" ]]; then
  echo "❌  GITHUB_TOKEN is not set."
  echo "    Generate one at: https://github.com/settings/tokens/new"
  echo "    Required scopes: repo (full)"
  exit 1
fi

if [[ -z "${GITHUB_REPO:-}" ]]; then
  echo "❌  GITHUB_REPO is not set."
  echo "    Format: owner/repo  e.g.  canflow-ai/canflow"
  exit 1
fi

BRANCH="${GITHUB_BRANCH:-main}"
COMMIT_MSG="${COMMIT_MSG:-chore: sync from Hercules App Builder}"
REMOTE_URL="https://x-access-token:${GITHUB_TOKEN}@github.com/${GITHUB_REPO}.git"

echo ""
echo "🚀  CanFlow.ai → GitHub Push"
echo "    Repo  : https://github.com/${GITHUB_REPO}"
echo "    Branch: ${BRANCH}"
echo ""

# ── Ensure git is initialised ─────────────────────────────────────────────────
if [[ ! -d ".git" ]]; then
  echo "ℹ️   Initialising new git repository…"
  git init -b "${BRANCH}"
fi

# ── Configure identity (required for CI/fresh envs) ───────────────────────────
git config user.email "ci@canflow.ai" 2>/dev/null || true
git config user.name  "CanFlow CI"   2>/dev/null || true

# ── Set remote ────────────────────────────────────────────────────────────────
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "${REMOTE_URL}"
else
  git remote add origin "${REMOTE_URL}"
fi

# ── Stage & commit ────────────────────────────────────────────────────────────
git add -A

if git diff --cached --quiet; then
  echo "ℹ️   Nothing to commit — working tree clean."
else
  git commit -m "${COMMIT_MSG}"
  echo "✅  Committed: ${COMMIT_MSG}"
fi

# ── Push ──────────────────────────────────────────────────────────────────────
echo "📤  Pushing to origin/${BRANCH}…"
git push --force-with-lease origin "HEAD:${BRANCH}" 2>&1 || \
  git push origin "HEAD:${BRANCH}"

echo ""
echo "✅  Done! View your repo at: https://github.com/${GITHUB_REPO}"
echo ""
