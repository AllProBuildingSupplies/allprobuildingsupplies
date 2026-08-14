#!/usr/bin/env bash
# Deploy the static storefront to the Cloudflare Pages TEST project only.
# Does NOT deploy GitHub Pages / allprobuildingsupplies.com.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$(mktemp -d /tmp/allpro-test-XXXXXX)"
cleanup() { rm -rf "$DIST"; }
trap cleanup EXIT

mkdir -p "$DIST/assets" "$DIST/images"
shopt -s nullglob
cp -f "$ROOT"/*.html "$DIST/" 2>/dev/null || true
cp -f "$ROOT/sw.js" "$DIST/" 2>/dev/null || true
cp -f "$ROOT/manifest.webmanifest" "$DIST/" 2>/dev/null || true
cp -a "$ROOT/assets/." "$DIST/assets/"
cp -a "$ROOT/images/." "$DIST/images/" 2>/dev/null || true
rm -f "$DIST/CNAME"

cd "$ROOT/backend"
npx wrangler pages deploy "$DIST" \
  --project-name=allpro-test \
  --commit-dirty=true \
  --branch=test
