const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
}

// NOTE:
// - SENTRY_AUTH_TOKEN / SENTRY_ORG / SENTRY_PROJECT が設定されている場合、build 時にソースマップが自動アップロードされます。
// - Auth Token は秘密情報なので、ローカル or CI のサーバ環境変数にのみ置いてください（クライアントに公開しない）。
const sentryWebpackPluginOptions = {
  silent: true,
}

module.exports = withSentryConfig(nextConfig, sentryWebpackPluginOptions)

