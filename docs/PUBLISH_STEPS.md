# 公開リポジトリ (thegentlelight-web-public) 運用メモ

このドキュメントは、**thegentlelight-web-public** を公開したあとの GitHub 設定と確認手順です。

---

## Step 5: GitHub リポジトリ設定（手動）

[https://github.com/miskydesu/thegentlelight-web-public/settings](https://github.com/miskydesu/thegentlelight-web-public/settings) で以下を実施してください。

### Branch protection (main)

- **Settings → Branches → Add branch protection rule**
- Branch name pattern: `main`
- 有効にする項目:
  - **Require a pull request before merging**（PR 必須）
  - **Do not allow bypassing the above settings**（管理者も含む）
  - **Require status checks to pass before merging** → CI の job 名（例: `Secret scan`, `Install, lint, build & audit`）を指定
- **Create** で保存

### Security

- **Settings → Security → Code security and analysis**
  - **Private vulnerability reporting**: Enabled
  - **Dependabot alerts**: Enabled（推奨）

### General

- **Settings → General**
  - **Issues**: 有効
  - **Discussions**: 任意（推奨）

---

## Step 6: 初回リリース（GitHub Release）

- **Code → Releases → Create a new release**
- **Choose a tag**: `v0.1.0` を選択
- **Release title**: `v0.1.0 – Initial Public Release`
- **Description** 例:

```text
Open-source UI for calm, topic-based news.

- Mock API included (USE_MOCK_DATA=1)
- Architecture and caching strategy documented
- Multi-edition (US / UK / Canada / Japan)
```

- **Publish release** で作成

---

## Step 7: 公開動作確認（新規クローン）

別ディレクトリで以下を実行し、第三者が動かせる状態であることを確認してください。

```bash
git clone https://github.com/miskydesu/thegentlelight-web-public.git
cd thegentlelight-web-public
cp env.example .env.local
# .env.local に USE_MOCK_DATA=1 のみ記載
pnpm install   # または npm install
pnpm build     # または npm run build
pnpm dev       # または npm run dev
```

確認項目:

- [ ] トップページが表示される
- [ ] `http://localhost:3000/api/mock/v1/us/latest` が 200 で JSON を返す
- [ ] ビルドが成功する

---

## セキュリティ最終チェック（公開前に毎回）

1. **秘密情報スキャン**（追跡ファイルのみ）:
   ```bash
   git ls-files | xargs grep -E 'API_KEY|SECRET|TOKEN|PASSWORD|BEGIN PRIVATE KEY' || true
   ```
   変数名のみで値が無ければ問題なし。

2. **Gitleaks**（推奨）:
   ```bash
   brew install gitleaks   # 未インストール時
   gitleaks detect --source . --verbose --config-path .gitleaks.toml --no-git false
   ```
   検出が出たら修正してから公開。

3. **.env.local はコミットしない** — 常に .gitignore で除外されていることを確認。
