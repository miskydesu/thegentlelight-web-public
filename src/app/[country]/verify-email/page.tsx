'use client'

import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { verifyEmail } from '@/lib/userAuth'

export default function VerifyEmailPage() {
  const params = useParams<{ country: string }>()
  const country = params?.country || 'us'
  const sp = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState(sp?.get('token') || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      await verifyEmail(token)
      router.push(`/${country}/me`)
    } catch (e: any) {
      setError(e?.message || '失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>メール認証</h1>
      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="トークン" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <button type="button" disabled={busy} onClick={() => void submit()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? '確認中…' : '認証する'}
          </button>
          <Link href={`/${country}/me`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            ← マイページへ
          </Link>
        </div>
      </section>
    </main>
  )
}


