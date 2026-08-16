#!/usr/bin/env bash
# Idempotent Cloud Agent setup for the All Pro Building Supplies storefront.
# Prepares the Cloudflare Worker backend for local `wrangler dev` and seeds a
# local D1 database so the storefront works end to end without touching prod.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/backend"

# 1. Backend dependencies (wrangler). Uses the committed lockfile.
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 2. Local dev secrets. `.dev.vars` is gitignored and local-only; wrangler dev
#    reads it. Generate throwaway dev values once and keep them stable across
#    reinstalls so tokens issued before a reinstall keep verifying.
if [ ! -f .dev.vars ]; then
  ADMIN_TOKEN="$(openssl rand -hex 16)"
  JWT_SECRET="$(openssl rand -hex 32)"
  cat > .dev.vars <<EOF
ADMIN_TOKEN=${ADMIN_TOKEN}
JWT_SECRET=${JWT_SECRET}
EOF
  echo "Created backend/.dev.vars with generated local dev secrets."
else
  echo "backend/.dev.vars already exists; leaving it unchanged."
fi

# 3. Apply the schema to the local D1 database. CREATE TABLE IF NOT EXISTS makes
#    this safe to run repeatedly. Local D1 data lives under backend/.wrangler/.
npx wrangler d1 execute allpro-db --local --file schema.sql

echo "Cloud Agent install complete."
