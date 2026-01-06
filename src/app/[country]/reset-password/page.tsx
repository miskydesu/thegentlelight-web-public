'use client'

import { useParams, useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'
import { resetPassword } from '@/lib/userAuth'

export default function ResetPasswordPage() {
  const params = useParams<{ country: string }>()
  const country = params.country
  const sp = useSearchParams()
  const router = useRouter()

  const [email, setEmail] = useState(sp.get('email') || '')
  const [token, setToken] = useState(sp.get('token') || '')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async () => {
    setError(null)
    setBusy(true)
    try {
      await resetPassword(email, token, pw)
      router.push(`/${country}/login`)
    } catch (e: any) {
      setError(e?.message || '失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>パスワードリセット</h1>
      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <input value={token} onChange={(e) => setToken(e.target.value)} placeholder="トークン" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="新しいパスワード" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <button type="button" disabled={busy} onClick={() => void submit()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? '更新中…' : '更新'}
          </button>
          <Link href={`/${country}/login`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            ← ログインへ
          </Link>
        </div>
      </section>
    </main>
  )
}


