# The Gentle Light — Web

**Calm news for your mental health.** This repository is the **front-end** of [The Gentle Light](https://thegentlelight.org): a multi-edition (US / UK / Canada / Japan) news site that reduces doomscrolling and information overload through gentle framing and editorial structure.

- **Production site:** [thegentlelight.org](https://thegentlelight.org)
- **What this project is:** Open-source UI for calm, topic-based news (see below).
- **What this project is NOT:** Backend API, data pipeline, or internal admin services (see below).

---

## これは何か / What this is

- **The Gentle Light の公式 Web フロントエンド**（Next.js 14, React）
- 国別エディション（US / UK / CA / JP）、Gentle モード、デイリーブリーフ、コラム・名言などの UI
- 本番は Cloudflare Pages を想定（Vercel も利用可能）
- **オープンにすることで得られるもの**: 信頼・E-E-A-T の補強、被リンク・引用・採用・コミュニティの資産化、プロダクト説明コストの削減

## これは何ではないか / What this is NOT

- **バックエンド API ではない** — ニュース・トピック・ユーザー認証は別サービス（非公開）が提供
- **データパイプライン・編集ツールではない** — 記事・トピックの収集・編集は別システム
- **管理者画面の認証ロジックそのものではない** — 管理用 API の URL・認証は非公開で運用

つまり「見えている部分」を公開し、**データ・運用・ブランド・プロダクト体験・継続の編集**は別レイヤーで守る設計です。

---

## 技術スタック

- **Next.js 14** (App Router)
- **React 18**, TypeScript
- **Cloudflare Pages** 本番デプロイ（`@cloudflare/next-on-pages`）
- オプション: Sentry, Google Analytics, Google ログイン

---

## クイックスタート（API なしで動かす）

第三者がフォークしてすぐビルド・表示できるように、**API を叩かずに UI だけ動かすモード**を用意しています。

```bash
git clone https://github.com/your-org/thegentlelight-web.git
cd thegentlelight-web
cp env.example .env.local
```

`.env.local` に以下だけ書く:

```env
USE_MOCK_DATA=1
```

```bash
npm install
npm run dev
```

ブラウザで http://localhost:3000 を開くと、`fixtures/*.json` のサンプルデータで UI が表示されます。本番 API のキーは不要です。

- モック時は `fixtures/` 内の JSON が使われ、不足分は空配列などで補われます
- 実 API を繋ぐ場合は `NEXT_PUBLIC_API_BASE_URL` を設定し、`USE_MOCK_DATA` は外す

---

## 環境変数

| 変数 | 説明 | 公開ビルドで必須？ |
|------|------|---------------------|
| `NEXT_PUBLIC_API_BASE_URL` | バックエンド API のベース URL | 本番のみ（未設定かつ `USE_MOCK_DATA=1` でモック） |
| `NEXT_PUBLIC_SITE_URL` | サイトの正規 URL（canonical・OG 用） | 本番で推奨 |
| `USE_MOCK_DATA` | `1` で fixtures を使用（API なしで UI 動作） | フォーク・デモ用 |
| `NEXT_PUBLIC_IMAGE_BASE_URL` | 画像配信のベース URL | 任意 |
| `ROBOTS_NOINDEX` | `true` で noindex（ステージング用） | 任意 |

その他（GA・Sentry・Google ログイン等）は `env.example` を参照してください。**API キー・トークン・DB 接続情報はリポジトリに含めません。**

---

## スクリプト

- `npm run dev` — 開発サーバー
- `npm run build` — Next.js ビルド
- `npm run build:cf` — Cloudflare Pages 用ビルド（next-on-pages + オプションで Sentry ソースマップ）
- `npm run start` — 本番モード起動
- `npm run lint` — ESLint

---

## アーキテクチャ概要

- **ルート `/`** — 国選択のランディング
- **`/[country]`** — 国別トップ（US/UK/CA/JP）
- **`/en/*`** — 英語圏のコラム・名言を共通化（308 で集約）
- **`/[country]/daily/*`** — デイリーブリーフ
- **`/[country]/news`**, **`/category/*`** — ニュース・カテゴリ
- API 呼び出しは `src/lib/tglApi.ts` の `fetchJson` に集約。モック時は `fixtures/` または `/api/mock/` を利用

---

## ライセンス

[Apache-2.0](LICENSE) — 商用利用・改変・配布を許諾。表示条項を満たせば利用可能です。

---

## 公開リポジトリとしてリリースするとき

1. **公開用ブランチで掃除** — 本番開発と混ぜず、`public-release` などのブランチで秘密情報の最終確認をすることを推奨
2. **秘密情報のスキャン** — リポジトリ全体で `API_KEY` / `SECRET` / `TOKEN` / `PASSWORD` / `BEGIN PRIVATE KEY` 等を検索し、コメントアウトや過去コミットに残っていないか確認
3. **`.env*` はコミットしない** — `.gitignore` で除外済み。含めるのは `env.example` のみ
4. 公開後は `package.json` の `"private": true` を外して npm 公開するかは任意

### 公開前チェックリスト（漏れない・壊れない）

公開前に手元で一発まわすことを推奨。検出が出たら**必ず潰してから**公開する。

| 項目 | 内容 |
|------|------|
| **1. Gitleaks** | ローカルで一度実行。`brew install gitleaks` のあと `./scripts/pre-publish-check.sh` または `gitleaks detect --config-path .gitleaks.toml --no-git false` |
| **2. 過去履歴** | 「過去に .env をコミットしたことが一度もない」「トークンを貼ったことが一度もない」に自信がなければ、履歴スキャン（`git log -p --all` で `sntryu_` / `ghp_` 等を検索）または `./scripts/pre-publish-check.sh` の履歴チェックを実行。心当たりがあれば **公開前に** `git filter-repo` / BFG で履歴書き換え |
| **3. 公開ビルド** | `env.example` を `.env.local` にコピーし `USE_MOCK_DATA=1` のみ設定 → `pnpm build`（または `npm run build`）成功 → 起動して `/api/mock/v1/us/latest` が 200 で返ることを確認。README の手順通りに第三者が動かせる状態であること |

一括実行: `./scripts/pre-publish-check.sh`（gitleaks 未インストール時はスキップし、履歴スキャン + lint + build を実行）

## 貢献・脆弱性報告

- **コントリビューション**: [CONTRIBUTING.md](CONTRIBUTING.md) を参照
- **脆弱性報告**: [SECURITY.md](SECURITY.md) の手順に従って非公開で報告してください
