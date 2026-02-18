#!/usr/bin/env bash
# 公開前に手元で一発まわすチェック
# 検出が出たら公開前に必ず潰す（例外なし）
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "=== 1. Gitleaks（現在のツリー + 履歴） ==="
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks detect --config-path .gitleaks.toml --verbose --no-git false 2>&1 || {
    echo "FAIL: gitleaks がシークレットを検出しました。公開前に必ず修正してください。"
    exit 1
  }
  echo "OK: gitleaks 検出なし"
else
  echo "SKIP: gitleaks がインストールされていません。"
  echo "      推奨: brew install gitleaks のあと再度実行"
  echo "      代替: 履歴スキャンのみ実行します"
fi

echo ""
echo "=== 2. 過去履歴スキャン（.env / トークン漏れ） ==="
# 履歴全体の diff に「トークンらしき値」が含まれていないか（値のみ検索し、README の変数名は除外）
if git log -p --all -- . 2>/dev/null | grep -qE '^\+.*sntryu_[a-zA-Z0-9]{30,}' 2>/dev/null; then
  echo "FAIL: 履歴に Sentry トークン値（sntryu_...）が含まれています。git filter-repo / BFG で履歴書き換えを検討してください。"
  exit 1
fi
if git log -p --all -- . 2>/dev/null | grep -qE '^\+.*(ghp_|gho_)[a-zA-Z0-9]{30,}' 2>/dev/null; then
  echo "FAIL: 履歴に GitHub トークン値が含まれています。"
  exit 1
fi
# 過去に .env や .env.local が追加されたコミットがないか
if git log --all --diff-filter=A --name-only -- .env .env.local '.env.*' 2>/dev/null | grep -qE '^\.env'; then
  echo "WARN: 履歴で .env 系ファイルが追加されたコミットがあります。内容を確認してください。"
  git log --all --oneline --diff-filter=A -- .env .env.local '.env.*' 2>/dev/null || true
fi
echo "OK: 履歴にトークン値は見つかりませんでした"

echo ""
echo "=== 3. 公開ビルド動作確認（USE_MOCK_DATA=1, CF_PAGES=1） ==="
RUNNER="npm run"
if command -v pnpm >/dev/null 2>&1; then
  RUNNER="pnpm run"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install 2>/dev/null || true
else
  npm ci 2>/dev/null || npm install 2>/dev/null || true
fi
echo "  使用: $RUNNER (lint → build)"
USE_MOCK_DATA=1 CF_PAGES=1 $RUNNER lint 2>&1
USE_MOCK_DATA=1 CF_PAGES=1 $RUNNER build 2>&1
echo "OK: ビルド成功"

echo ""
echo "=== 公開前チェック完了 ==="
echo "  - env.example を .env.local にコピーして USE_MOCK_DATA=1 で起動"
echo "  - ブラウザで /api/mock/v1/us/latest が 200 で返ることを確認"
echo "  - README の手順通りに第三者が動かせる状態であることを確認"
