import * as Sentry from '@sentry/nextjs'

const parseRate = (value: string | undefined, fallback: number) => {
  const n = value === undefined ? Number.NaN : Number(value)
  return Number.isFinite(n) ? n : fallback
}

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  environment: process.env.SENTRY_ENVIRONMENT,
  tracesSampleRate: parseRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0),
})


