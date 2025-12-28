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

### ローカルでの確認手順（最短）

- `env.example` を参考に `.env.local` を作って DSN を入れる
- `npm run dev`
- `http://localhost:3000/test` の **「③ Sentry送信テスト」** で
  - 「ブラウザ側イベント送信」
  - 「Next.jsサーバ側（Route Handler）送信」
  を押し、Sentryにイベントが1件ずつ届くことを確認