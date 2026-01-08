'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getSession, getUserToken, login, loginWithGoogleIdToken, setUserToken } from '@/lib/userAuth'
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
  const country = params?.country || 'us'
  const isJp = country === 'jp'
  const router = useRouter()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const googleInitRef = useRef(false)

  useEffect(() => {
    // 既にログイン済みなら /me へ（ログイン画面に戻ってきても自動遷移）
    void (async () => {
      try {
        const token = getUserToken()
        if (!token) return
        await getSession()
        router.replace(`/${country}/me`)
      } catch (e: any) {
        const status = e?.status
        const msg = String(e?.message || '')
        if (status === 401 || msg.toLowerCase().includes('unauthorized')) {
          setUserToken(null)
        }
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const clientId = googleClientId
    if (!clientId) return
    if (typeof window === 'undefined') return
    if (!googleBtnRef.current) return
    if (googleInitRef.current) return

    googleInitRef.current = true

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.google?.accounts?.id) return resolve()
        const existing = document.querySelector('script[data-google-gis="1"]') as HTMLScriptElement | null
        if (existing) {
          existing.addEventListener('load', () => resolve())
          existing.addEventListener('error', () => reject(new Error('failed to load google gis')))
          return
        }
        const s = document.createElement('script')
        s.src = 'https://accounts.google.com/gsi/client'
        s.async = true
        s.defer = true
        s.dataset.googleGis = '1'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('failed to load google gis'))
        document.head.appendChild(s)
      })

    void (async () => {
      try {
        await loadScript()
        const g = window.google
        if (!g?.accounts?.id) return
        g.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            const cred = String(resp?.credential || '').trim()
            if (!cred) {
              setError(isJp ? 'Googleログインに失敗しました（credentialが空）' : 'Google sign-in failed (empty credential)')
              return
            }
            setError(null)
            setBusy(true)
            await openProgressDialog(isJp ? 'ログイン中…' : 'Signing in…')
            try {
              await loginWithGoogleIdToken(cred, { remember })
              // sync cookie saved -> DB
              try {
                const keys = readSavedKeys()
                if (keys.length) await importServerSavedKeys(keys)
              } catch {
                // ignore
              }
              router.push(`/${country}/me`)
            } catch (e: any) {
              const status = e?.status
              const msg = String(e?.message || '').trim()
              if (status === 401 && (msg === 'account_not_found' || msg.toLowerCase() === 'no account found.')) {
                setError(
                  isJp
                    ? '該当のアカウントはありません。新規作成画面からお試しください。'
                    : 'No account found. Please try from the sign-up page.'
                )
              } else {
                setError(msg || (isJp ? 'ログインに失敗しました' : 'Sign-in failed'))
              }
            } finally {
              await closeProgressDialog()
              setBusy(false)
            }
          },
        })

        // Render button
        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
          // ブラウザの言語に引っ張られて日本語になることがあるため、ページ側の言語に寄せる
          locale: country === 'jp' ? 'ja' : 'en',
        })
      } catch (e: any) {
        setError(isJp ? `Googleログインの初期化に失敗しました: ${e?.message || String(e)}` : `Failed to init Google sign-in: ${e?.message || String(e)}`)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} />
            </div>
            {!googleClientId ? (
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {isJp
                  ? '※ Googleログインには NEXT_PUBLIC_GOOGLE_CLIENT_ID が必要です'
                  : '※ Google sign-in requires NEXT_PUBLIC_GOOGLE_CLIENT_ID'}
              </div>
            ) : null}
          </div>
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


