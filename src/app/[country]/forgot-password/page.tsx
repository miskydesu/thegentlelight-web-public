'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { forgotPassword } from '@/lib/userAuth'

export default function ForgotPasswordPage() {
  const params = useParams<{ country: string }>()
  const country = params.country
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [devToken, setDevToken] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setMessage(null)
    setDevToken(null)
    try {
      const r = await forgotPassword(email)
      setMessage('再発行メールを送信しました（該当ユーザーがいる場合）')
      if (r.dev_reset_token) setDevToken(r.dev_reset_token)
    } catch (e: any) {
      setMessage(e?.message || '失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>パスワード再発行</h1>
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="メールアドレス" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <button type="button" disabled={busy} onClick={() => void submit()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? '送信中…' : '送信'}
          </button>
          {message ? <div style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{message}</div> : null}
          {devToken ? (
            <div style={{ fontSize: 13 }}>
              dev token: <code>{devToken}</code>
              <div>
                <Link href={`/${country}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(devToken)}`}>リセットへ</Link>
              </div>
            </div>
          ) : null}
          <Link href={`/${country}/login`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            ← ログインへ
          </Link>
        </div>
      </section>
    </main>
  )
}


