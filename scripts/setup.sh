#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# CanFlow.ai — setup.sh
# One-command setup for new developers.
# Usage: chmod +x scripts/setup.sh && ./scripts/setup.sh
# ──────────────────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}==>${NC} $1"; }
ok()   { echo -e "${GREEN}  ✔${NC} $1"; }
warn() { echo -e "${YELLOW}  ⚠${NC} $1"; }
fail() { echo -e "${RED}  ✘${NC} $1"; exit 1; }

# ── Check Node.js ──────────────────────────────────────────────────────────
log "Checking Node.js…"
if ! command -v node &>/dev/null; then
  fail "Node.js is not installed. Install Node.js 22+ from https://nodejs.org"
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 22 ]; then
  fail "Node.js 22+ required (found $(node -v)). Upgrade from https://nodejs.org"
fi
ok "Node.js $(node -v)"

# ── Check / Install pnpm ──────────────────────────────────────────────────
log "Checking pnpm…"
if ! command -v pnpm &>/dev/null; then
  warn "pnpm not found — installing via corepack…"
  corepack enable && corepack prepare pnpm@latest --activate
  if ! command -v pnpm &>/dev/null; then
    warn "corepack failed — trying npm install…"
    npm install -g pnpm
  fi
fi

PNPM_VERSION=$(pnpm -v)
ok "pnpm $PNPM_VERSION"

# ── Install dependencies ───────────────────────────────────────────────────
log "Installing dependencies…"
pnpm install
ok "Dependencies installed"

# ── Create .env.local if missing ───────────────────────────────────────────
if [ ! -f .env.local ]; then
  if [ -f .env.example ]; then
    cp .env.example .env.local
    warn ".env.local created from .env.example — edit it with your credentials"
  fi
else
  ok ".env.local already exists"
fi

# ── TypeScript check ───────────────────────────────────────────────────────
log "Running TypeScript check…"
pnpm exec tsc --noEmit
ok "TypeScript check passed"

# ── Build ──────────────────────────────────────────────────────────────────
log "Running production build…"
pnpm run build
ok "Build completed"

# ── Done ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  CanFlow.ai setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Start development:"
echo "    pnpm dev"
echo ""
echo "  Edit environment:"
echo "    .env.local"
echo ""
echo "  Build for production:"
echo "    pnpm build"
echo "    docker compose up --build -d"
echo ""
