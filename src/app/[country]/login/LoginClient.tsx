'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { login, loginWithGoogleIdToken } from '@/lib/userAuth'
import { readSavedKeys } from '@/lib/savedTopics'
import { importServerSavedKeys } from '@/lib/userAuth'
import { closeProgressDialog, openProgressDialog } from '@/lib/publicSwal'

declare global {
  interface Window {
    google?: any
  }
}

export default function LoginClient() {
  const params = useParams<{ country: string }>()
  const country = params.country
  const isJp = country === 'jp'
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const doLogin = async () => {
    setError(null)
    setBusy(true)
    await openProgressDialog(isJp ? 'ログイン中…' : 'Signing in…')
    try {
      await login(email, password, { remember })
      // sync cookie saved -> DB
      try {
        const keys = readSavedKeys()
        if (keys.length) await importServerSavedKeys(keys)
      } catch {
        // ignore
      }
      router.push(`/${country}/me`)
    } catch (e: any) {
      setError(e?.message || (isJp ? 'ログインに失敗しました' : 'Sign-in failed'))
    } finally {
      await closeProgressDialog()
      setBusy(false)
    }
  }

  const doGoogle = async () => {
    setError(null)
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
    if (!clientId) {
      setError(isJp ? 'NEXT_PUBLIC_GOOGLE_CLIENT_ID が未設定です' : 'NEXT_PUBLIC_GOOGLE_CLIENT_ID is not set')
      return
    }
    setBusy(true)
    try {
      // GIS: one-tap is more work; simplest popup token is not available without rendering button.
      // Here we expect you to wire a proper GIS button later; keep endpoint ready.
      setError(
        isJp
          ? 'Googleログインは準備中です（API側は /v1/auth/google 対応済み）'
          : 'Google sign-in is not ready yet (API /v1/auth/google is prepared).'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{isJp ? 'ログイン' : 'Sign in'}</h1>

      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void doLogin()
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="login-email" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isJp ? 'メールアドレス' : 'Email'}
            </label>
            <input
              id="login-email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="login-password" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isJp ? 'パスワード' : 'Password'}
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: busy ? 'not-allowed' : 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} disabled={busy} />
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{isJp ? '次回から自動ログイン（30日）' : 'Keep me signed in (30 days)'}</span>
          </label>
          <button type="submit" disabled={busy} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? (isJp ? 'ログイン中…' : 'Signing in…') : isJp ? 'ログイン' : 'Sign in'}
          </button>
          <button type="button" disabled={busy} onClick={() => void doGoogle()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', color: '#000', fontWeight: 800 }}>
            {isJp ? 'Googleでログイン' : 'Continue with Google'}
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', fontSize: 13 }}>
            <Link href={`/${country}/signup`} style={{ color: 'var(--text)' }}>
              {isJp ? '新規登録へ' : 'Create an account'}
            </Link>
            <Link href={`/${country}/forgot-password`} style={{ color: 'var(--muted)' }}>
              {isJp ? 'パスワードを忘れた' : 'Forgot password'}
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}


