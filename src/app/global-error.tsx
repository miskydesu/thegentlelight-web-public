'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="ja">
      <body style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
        <h2>エラーが発生しました</h2>
        <p style={{ color: '#666' }}>必要に応じて、少し待ってから再試行してください。</p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: '#fff',
            cursor: 'pointer',
          }}
        >
          再試行
        </button>
      </body>
    </html>
  )
}


