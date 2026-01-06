# thegentlelight
The Gentle LightのWEB側（フロント／管理画面共通）

## Cloud Run deploy
Apple Silicon の場合は必ず:
docker build --platform linux/amd64

## Sentry（エラー監視）導入メモ

- 必須
  - `SENTRY_DSN`（サーバ側）
  - `NEXT_PUBLIC_SENTRY_DSN`（ブラウザ側）
- 推奨（ソースマップ自動アップロード）
  - `SENTRY_AUTH_TOKEN`（秘密情報）
  - `SENTRY_ORG`
  - `SENTRY_PROJECT`

### Cloudflare Pages（stg/prod）でのソースマップアップロード

Cloudflare Pages（next-on-pages）では、SentryのNext.js webpackプラグインが変換ステップで不具合になるケースがあるため、
`next.config.js` 側で Cloudflare Pages ではプラグインを無効化し、**ビルドコマンド側で sourcemaps upload** を実行します。

- Cloudflare Pages の Build command を `npm run build:cf` にする
- Environment variables（Preview/Production）に以下を設定
  - `SENTRY_AUTH_TOKEN` / `SENTRY_ORG` / `SENTRY_PROJECT`

### ローカルでの確認手順（最短）

- `env.example` を参考に `.env.local` を作って DSN を入れる
- `npm run dev`
- `http://localhost:3000/test` の **「③ Sentry送信テスト」** で
  - 「ブラウザ側イベント送信」
  - 「Next.jsサーバ側（Route Handler）送信」
  を押し、Sentryにイベントが1件ずつ届くことを確認