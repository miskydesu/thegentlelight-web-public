import * as Sentry from '@sentry/nextjs'

const parseRate = (value: string | undefined, fallback: number) => {
  const n = value === undefined ? Number.NaN : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  // Next.js が実行ランタイム（nodejs/edge）ごとに register() を呼び分ける
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    Sentry.init({
      dsn,
      enabled: true,
      environment: process.env.SENTRY_ENVIRONMENT,
      tracesSampleRate: parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE, 0),
    })
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      enabled: true,
      environment: process.env.SENTRY_ENVIRONMENT,
    })
  }
}
// NOTE:
// Cloudflare Pages（next-on-pages）環境では、`onRequestError` の export がバンドル時の衝突要因になることがあるため、
// ここでは export しない運用にしています。必要になったら（OpenNext等へ移行後に）復活させてOKです。


