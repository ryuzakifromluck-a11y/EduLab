#!/usr/bin/env bash
# Manual deploy to Vercel, for when CI is unavailable or you want a preview URL.
#
#   scripts/deploy.sh            # preview deployment
#   scripts/deploy.sh --prod     # production
#   scripts/deploy.sh --skip-checks --prod
#
# Runs the same checks as CI (lint, typecheck, test), builds with `vercel build`
# (static site + api/ Functions + vercel.json headers), deploys the prebuilt output and
# smoke-tests the result. Needs the Vercel CLI to be logged in (`npx vercel login`) or
# VERCEL_TOKEN in the environment, and the folder linked once with `npx vercel link`.
set -euo pipefail

cd "$(dirname "$0")/.."

VERCEL_CLI="${VERCEL_CLI:-vercel@64.4.0}"
PROD=0
CHECKS=1
for arg in "$@"; do
  case "$arg" in
    --prod) PROD=1 ;;
    --skip-checks) CHECKS=0 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

vercel() { npx --yes "$VERCEL_CLI" "$@" ${VERCEL_TOKEN:+--token="$VERCEL_TOKEN"}; }

if [ ! -f .vercel/project.json ] && [ -z "${VERCEL_PROJECT_ID:-}" ]; then
  echo "This folder is not linked to a Vercel project. Run: npx $VERCEL_CLI link" >&2
  exit 1
fi

if [ -n "$(git status --porcelain 2>/dev/null || true)" ]; then
  echo "⚠ Uncommitted changes will be included in this deployment."
fi

if [ "$CHECKS" = 1 ]; then
  echo "▶ Lint, typecheck, test"
  npm run lint
  npm run typecheck
  npm test
fi

env_name=preview
prod_flag=""
if [ "$PROD" = 1 ]; then
  env_name=production
  prod_flag="--prod"
fi

release="$(git rev-parse --short HEAD 2>/dev/null || echo manual)"
echo "▶ Building $release for $env_name"
vercel pull --yes --environment="$env_name"
VITE_RELEASE="$release" vercel build $prod_flag

echo "▶ Deploying"
url="$(vercel deploy --prebuilt $prod_flag)"
echo "Deployed: $url"

echo "▶ Smoke test"
node scripts/smoke.mjs "${SMOKE_URL:-$url}" ${API_URL:+--api "$API_URL"} --retries 5 || {
  echo "Smoke test failed. To restore the previous production deployment: npx $VERCEL_CLI rollback" >&2
  exit 1
}
