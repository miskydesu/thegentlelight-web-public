/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 末尾スラッシュを削除（SEO対策：リダイレクトエラーを防ぐ）
  trailingSlash: false,
}

// Cloudflare Pages（next-on-pages）では、SentryのNext.js webpackプラグイン有効時に
// 変換ステップでエラーになるケースがあるため、Cloudflare Pagesでは無効化します。
// その場合のソースマップアップロードは「ビルドコマンド側」で sentry-cli を実行する想定です。
const isCloudflarePages =
  Boolean(process.env.CF_PAGES) ||
  Boolean(process.env.CF_PAGES_BRANCH) ||
  Boolean(process.env.CF_PAGES_URL)

if (isCloudflarePages) {
  module.exports = nextConfig
} else {
  const { withSentryConfig } = require('@sentry/nextjs')
  const sentryWebpackPluginOptions = { silent: true }
  module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)
}

