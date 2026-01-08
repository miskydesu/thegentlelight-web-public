'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { getSession, getUserToken, setUserToken, signup, signupWithGoogleIdToken } from '@/lib/userAuth'
import { readSavedKeys } from '@/lib/savedTopics'
import { importServerSavedKeys } from '@/lib/userAuth'
import { closeProgressDialog, openProgressDialog } from '@/lib/publicSwal'

export default function SignupClient() {
  const params = useParams<{ country: string }>()
  const country = params?.country || 'us'
  const isJp = country === 'jp'
  const router = useRouter()
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement | null>(null)
  const googleInitRef = useRef(false)

  useEffect(() => {
    // 既にログイン済みなら /me へ（サインアップ画面に戻ってきても自動遷移）
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
        const w: any = window as any
        if (w.google?.accounts?.id) return resolve()
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
        const w: any = window as any
        const g = w.google
        if (!g?.accounts?.id) return

        g.accounts.id.initialize({
          client_id: clientId,
          callback: async (resp: any) => {
            const cred = String(resp?.credential || '').trim()
            if (!cred) {
              setError(isJp ? 'Google登録に失敗しました（credentialが空）' : 'Google sign-up failed (empty credential)')
              return
            }

            setError(null)
            setBusy(true)
            await openProgressDialog(isJp ? '登録中…' : 'Creating account…')
            try {
              await signupWithGoogleIdToken(cred, { remember: true })
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
              if (status === 409 && (msg === 'email_already_registered' || msg.includes('email already exists'))) {
                setError(
                  isJp
                    ? 'このメールアドレスは既に登録されています。ログイン画面からお試しください。'
                    : 'This email is already registered. Please try signing in.'
                )
              } else if (status === 409 && msg === 'google_account_already_registered') {
                setError(
                  isJp
                    ? 'このGoogleアカウントは既に登録されています。ログイン画面からお試しください。'
                    : 'This Google account is already registered. Please try signing in.'
                )
              } else {
                setError(msg || (isJp ? '登録に失敗しました' : 'Sign-up failed'))
              }
            } finally {
              await closeProgressDialog()
              setBusy(false)
            }
          },
        })

        g.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 360,
          text: 'continue_with',
          locale: country === 'jp' ? 'ja' : 'en',
        })
      } catch (e: any) {
        setError(isJp ? `Google登録の初期化に失敗しました: ${e?.message || String(e)}` : `Failed to init Google sign-up: ${e?.message || String(e)}`)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const validate = () => {
    const e = email.trim()
    if (!e) return isJp ? 'メールアドレスを入力してください' : 'Please enter your email address'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return isJp ? 'メールアドレスの形式が正しくありません' : 'Please enter a valid email address'
    const pw = password
    if (pw.length < 10) return isJp ? 'パスワードは10文字以上にしてください' : 'Password must be at least 10 characters'
    if (!/[a-z]/.test(pw)) return isJp ? 'パスワードに英小文字を含めてください' : 'Password must include a lowercase letter'
    if (!/[A-Z]/.test(pw)) return isJp ? 'パスワードに英大文字を含めてください' : 'Password must include an uppercase letter'
    if (!/[0-9]/.test(pw)) return isJp ? 'パスワードに数字を含めてください' : 'Password must include a number'
    return null
  }

  const doSignup = async () => {
    setError(null)
    const v = validate()
    if (v) {
      setError(v)
      return
    }
    setBusy(true)
    await openProgressDialog(isJp ? '登録中…' : 'Creating account…')
    try {
      await signup(email, password)
      // sync cookie saved -> DB
      try {
        const keys = readSavedKeys()
        if (keys.length) await importServerSavedKeys(keys)
      } catch {
        // ignore
      }
      router.push(`/${country}/me`)
    } catch (e: any) {
      const msg = String(e?.message || '')
      if (msg.includes('email already exists') || msg === 'email_already_registered')
        setError(isJp ? 'このメールアドレスは既に登録されています' : 'This email is already registered')
      else if (msg.includes('password must'))
        setError(
          isJp
            ? 'パスワード条件を満たしていません（10文字以上/英大文字/英小文字/数字）'
            : 'Password does not meet the requirements (10+ chars, upper/lowercase, number)'
        )
      else setError(msg || (isJp ? '登録に失敗しました' : 'Sign-up failed'))
    } finally {
      await closeProgressDialog()
      setBusy(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '20px' }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{isJp ? '新規登録' : 'Create an account'}</h1>

      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            void doSignup()
          }}
          style={{ display: 'grid', gap: 10 }}
        >
          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="signup-email" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isJp ? 'メールアドレス（ID）' : 'Email'}
            </label>
            <input
              id="signup-email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            <label htmlFor="signup-password" style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isJp ? 'パスワード（10文字以上、英大文字/小文字/数字を含む）' : 'Password (10+ chars, upper/lowercase, number)'}
            </label>
            <input
              id="signup-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
          </div>
          <button type="submit" disabled={busy} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
            {busy ? (isJp ? '登録中…' : 'Creating…') : isJp ? '登録' : 'Create account'}
          </button>
          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div ref={googleBtnRef} />
            </div>
          </div>
          <div style={{ fontSize: 13 }}>
            <Link href={`/${country}/login`} style={{ color: 'var(--text)' }}>
              {isJp ? 'すでにアカウントをお持ちですか？ログインへ' : 'Already have an account? Sign in'}
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}


