'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin, setAdminToken } from '../../../lib/tglAdminApi'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await adminLogin(email.trim(), password)
      setAdminToken(res.token)
      router.push('/admin/topics')
    } catch (err: any) {
      setError(err?.message || 'ログインに失敗しました')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <h1 style={{ fontSize: '1.4rem' }}>Admin Login</h1>
      <div style={{ height: 12 }} />

      <form className="tglRow" onSubmit={submit} style={{ maxWidth: 520 }}>
        <div className="tglRowTitle">ログイン</div>
        <div style={{ height: 10 }} />

        <label className="tglMuted" style={{ display: 'block', marginBottom: 6 }}>
          Email
        </label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          style={{ width: '100%', padding: '0.6rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.18)' }}
        />

        <div style={{ height: 12 }} />

        <label className="tglMuted" style={{ display: 'block', marginBottom: 6 }}>
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          style={{ width: '100%', padding: '0.6rem', borderRadius: 10, border: '1px solid rgba(0,0,0,0.18)' }}
        />

        <div style={{ height: 12 }} />

        <button className="tglButton" type="submit" disabled={busy} style={{ width: '100%' }}>
          {busy ? 'ログイン中…' : 'ログイン'}
        </button>

        {error ? (
          <div style={{ marginTop: 12, color: '#b00020', whiteSpace: 'pre-wrap' }}>
            {error}
          </div>
        ) : null}
      </form>
    </main>
  )
}


