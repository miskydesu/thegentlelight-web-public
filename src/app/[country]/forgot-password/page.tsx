'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import { forgotPassword } from '@/lib/userAuth'

export default function ForgotPasswordPage() {
  const params = useParams<{ country: string }>()
  const country = params.country
  const isJp = country === 'jp'
  const showDev = process.env.NODE_ENV !== 'production'
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
      setMessage(isJp ? '再発行メールを送信しました（該当ユーザーがいる場合）' : 'If the account exists, a reset email has been sent.')
      if (showDev && r.dev_reset_token) setDevToken(r.dev_reset_token)
    } catch (e: any) {
      setMessage(e?.message || (isJp ? '失敗しました' : 'Failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{isJp ? 'パスワード再発行' : 'Forgot password'}</h1>
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={isJp ? 'メールアドレス' : 'Email'}
            style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
          />
          <button type="button" disabled={busy} onClick={() => void submit()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? (isJp ? '送信中…' : 'Sending…') : isJp ? '送信' : 'Send'}
          </button>
          {message ? <div style={{ color: 'var(--muted)', fontSize: 13, whiteSpace: 'pre-wrap' }}>{message}</div> : null}
          {showDev && devToken ? (
            <div style={{ fontSize: 13 }}>
              {isJp ? '（dev）トークン:' : 'dev token:'} <code>{devToken}</code>
              <div>
                <Link href={`/${country}/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(devToken)}`}>{isJp ? 'リセットへ' : 'Go to reset'}</Link>
              </div>
            </div>
          ) : null}
          <Link href={`/${country}/login`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            {isJp ? '← ログインへ' : '← Back to sign in'}
          </Link>
        </div>
      </section>
    </main>
  )
}


