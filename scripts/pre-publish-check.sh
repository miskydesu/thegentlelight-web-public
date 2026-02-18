#!/usr/bin/env bash
# Pre-publish check: run locally before pushing to the public repo.
# If anything is reported, fix it before publishing (no exceptions).
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1. Gitleaks (working tree + history) ==="
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --config-path .gitleaks.toml --verbose --no-git false 2>&1 || {
    echo "FAIL: Gitleaks found secrets. Fix them before publishing."
    exit 1
  }
  echo "OK: No gitleaks findings"
else
  echo "SKIP: Gitleaks not installed."
  echo "      Recommended: brew install gitleaks, then run again"
  echo "      Continuing with history scan only."
fi

echo ""
echo "=== 2. History scan (.env / token leaks) ==="
if git log -p --all -- . 2>/dev/null | grep -qE '^\+.*sntryu_[a-zA-Z0-9]{30,}' 2>/dev/null; then
  echo "FAIL: History contains Sentry token value (sntryu_...). Consider git filter-repo or BFG."
  exit 1
fi
if git log -p --all -- . 2>/dev/null | grep -qE '^\+.*(ghp_|gho_)[a-zA-Z0-9]{30,}' 2>/dev/null; then
  echo "FAIL: History contains GitHub token value."
  exit 1
fi
if git log --all --diff-filter=A --name-only -- .env .env.local '.env.*' 2>/dev/null | grep -qE '^\.env'; then
  echo "WARN: History has commits that added .env files. Review their contents."
  git log --all --oneline --diff-filter=A -- .env .env.local '.env.*' 2>/dev/null || true
fi
echo "OK: No token values found in history"

echo ""
echo "=== 3. Public build (USE_MOCK_DATA=1, CF_PAGES=1) ==="
RUNNER="npm run"
if command -v pnpm >/dev/null 2>&1; then
  RUNNER="pnpm run"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install 2>/dev/null || true
else
  npm ci 2>/dev/null || npm install 2>/dev/null || true
fi
echo "  Using: $RUNNER (lint → build)"
USE_MOCK_DATA=1 CF_PAGES=1 $RUNNER lint 2>&1
USE_MOCK_DATA=1 CF_PAGES=1 $RUNNER build 2>&1
echo "OK: Build succeeded"

echo ""
echo "=== Pre-publish check done ==="
echo "  - Copy env.example to .env.local, set USE_MOCK_DATA=1, then run the app"
echo "  - Confirm /api/mock/v1/us/latest returns 200"
echo "  - Confirm README instructions work for a third party"
