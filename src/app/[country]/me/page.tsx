'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSession, setUserToken, updateGentleMode, changePassword, requestEmailVerify, requestEmailChange, confirmEmailChange } from '@/lib/userAuth'
import { setPreferredGentle } from '@/lib/view-switch'
import styles from './me.module.css'

export default function MyPage() {
  const params = useParams<{ country: string }>()
  const country = params.country
  const router = useRouter()
  const isJp = country === 'jp'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [googleSub, setGoogleSub] = useState<string | null>(null)
  const [gentleMode, setGentleMode] = useState<boolean | null>(null)
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [devInfo, setDevInfo] = useState<string | null>(null)

  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [busyPw, setBusyPw] = useState(false)

  const load = async () => {
    setError(null)
    setLoading(true)
    try {
      const s = await getSession()
      setEmail(s.user.email)
      setGoogleSub(s.user.google_sub)
      setEmailVerifiedAt((s.user as any).email_verified_at ?? null)
      setGentleMode(s.settings?.gentle_mode ?? null)
    } catch (e: any) {
      const status = e?.status
      const msg = String(e?.message || '')
      if (status === 401 || msg.toLowerCase().includes('unauthorized')) {
        setUserToken(null)
        router.push(`/${country}/login`)
      } else {
        setError(msg || '読み込みに失敗しました（APIに接続できない可能性があります）')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveGentlePref = async (next: boolean | null) => {
    setError(null)
    try {
      const r = await updateGentleMode(next)
      setGentleMode(r.settings.gentle_mode)
      // ON/OFF固定の場合は、サイト全体の挙動（gentle=1持ち回り）に合わせてlocalStorageも同期
      if (typeof r.settings.gentle_mode === 'boolean') setPreferredGentle(r.settings.gentle_mode)
    } catch (e: any) {
      setError(e?.message || '更新に失敗しました')
    }
  }

  const savePw = async () => {
    setError(null)
    setBusyPw(true)
    try {
      await changePassword(curPw, newPw)
      setCurPw('')
      setNewPw('')
    } catch (e: any) {
      setError(e?.message || 'パスワード変更に失敗しました')
    } finally {
      setBusyPw(false)
    }
  }

  const sendVerify = async () => {
    setError(null)
    setDevInfo(null)
    try {
      const r = await requestEmailVerify()
      if (r.dev_verify_token) {
        setDevInfo(`dev_verify_token: ${r.dev_verify_token}`)
        setEmailToken(r.dev_verify_token)
      }
    } catch (e: any) {
      setError(e?.message || '送信に失敗しました')
    }
  }

  const requestChange = async () => {
    setError(null)
    setDevInfo(null)
    try {
      const r = await requestEmailChange(newEmail)
      if (r.dev_change_token) {
        setDevInfo(`dev_change_token: ${r.dev_change_token}`)
        setEmailToken(r.dev_change_token)
      }
    } catch (e: any) {
      setError(e?.message || '送信に失敗しました')
    }
  }

  const confirmChange = async () => {
    setError(null)
    setDevInfo(null)
    try {
      await confirmEmailChange(emailToken)
      await load()
    } catch (e: any) {
      setError(e?.message || '変更に失敗しました')
    }
  }

  if (loading) {
    return (
      <main style={{ maxWidth: 720, margin: '0 auto', padding: 20, color: 'var(--muted)' }}>
        Loading…
      </main>
    )
  }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>マイページ</h1>

      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>ログイン情報</div>
          <button
            type="button"
            onClick={() => {
              setUserToken(null)
              router.push(`/${country}`)
            }}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', fontSize: 13 }}
          >
            {isJp ? 'ログアウト' : 'Log out'}
          </button>
        </div>
        <div style={{ color: 'var(--muted)' }}>{email || '—'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>{googleSub ? 'Google連携: あり' : 'Google連携: なし'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          メール認証: {emailVerifiedAt ? `済（${new Date(emailVerifiedAt).toLocaleString()}）` : '未'}
        </div>
        {!emailVerifiedAt ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button type="button" onClick={() => void sendVerify()} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', background: '#fff' }}>
              認証メールを送る
            </button>
            <Link href={`/${country}/verify-email?token=${encodeURIComponent(emailToken)}`} style={{ fontSize: 13, color: 'var(--muted)' }}>
              （dev）確認ページへ
            </Link>
          </div>
        ) : null}
        {devInfo ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{devInfo}</div> : null}
      </section>

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? 'Gentle Mode 設定' : 'Gentle Mode preference'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
          {isJp ? 'ON / OFF 固定、または最後の状態を引き継ぐ（サイトで切り替えた状態）を選べます。' : 'Choose ON, OFF, or inherit the last state you used on the site.'}
        </div>
        <div className={styles.gentleRadioGrid}>
          <label
            className={`${styles.gentleRadioItem} ${gentleMode === true ? styles.gentleRadioItemSelected : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') void saveGentlePref(true)
            }}
            tabIndex={0}
          >
            <input className={styles.srOnly} type="radio" name="gentlePref" checked={gentleMode === true} onChange={() => void saveGentlePref(true)} />
            <div className={styles.gentleRadioLeft}>
              <div className={styles.gentleRadioTitle}>{isJp ? 'ON（固定）' : 'ON (fixed)'}</div>
              <div className={styles.gentleRadioDesc}>{isJp ? 'ログイン時Gentle ModeをONに設定' : 'Always show with Gentle Mode ON'}</div>
            </div>
            <span className={styles.gentleRadioDot} aria-hidden="true" />
          </label>

          <label
            className={`${styles.gentleRadioItem} ${gentleMode === false ? styles.gentleRadioItemSelected : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') void saveGentlePref(false)
            }}
            tabIndex={0}
          >
            <input className={styles.srOnly} type="radio" name="gentlePref" checked={gentleMode === false} onChange={() => void saveGentlePref(false)} />
            <div className={styles.gentleRadioLeft}>
              <div className={styles.gentleRadioTitle}>{isJp ? 'OFF（固定）' : 'OFF (fixed)'}</div>
              <div className={styles.gentleRadioDesc}>{isJp ? 'ログイン時Gentle ModeをOFFに設定' : 'Always show with Gentle Mode OFF'}</div>
            </div>
            <span className={styles.gentleRadioDot} aria-hidden="true" />
          </label>

          <label
            className={`${styles.gentleRadioItem} ${gentleMode === null ? styles.gentleRadioItemSelected : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') void saveGentlePref(null)
            }}
            tabIndex={0}
          >
            <input className={styles.srOnly} type="radio" name="gentlePref" checked={gentleMode === null} onChange={() => void saveGentlePref(null)} />
            <div className={styles.gentleRadioLeft}>
              <div className={styles.gentleRadioTitle}>{isJp ? '最後の状態を引き継ぐ' : 'Inherit last state'}</div>
              <div className={styles.gentleRadioDesc}>{isJp ? '最後に切り替えた状態を引き継ぐ' : 'Use the last state you toggled on the site'}</div>
            </div>
            <span className={styles.gentleRadioDot} aria-hidden="true" />
          </label>
        </div>
      </section>

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>ID（メールアドレス）変更</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="新しいメールアドレス" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
          <button type="button" onClick={() => void requestChange()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', fontWeight: 800 }}>
            変更用メールを送る
          </button>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input value={emailToken} onChange={(e) => setEmailToken(e.target.value)} placeholder="（dev）トークン" style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', flex: '1 1 240px' }} />
            <button type="button" onClick={() => void confirmChange()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
              変更を確定
            </button>
          </div>
          <Link href={`/${country}/confirm-email-change?token=${encodeURIComponent(emailToken)}`} style={{ fontSize: 13, color: 'var(--muted)' }}>
            （dev）確認ページへ
          </Link>
        </div>
      </section>

      {!googleSub ? (
        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>パスワード変更</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <input type="password" placeholder="現在のパスワード" value={curPw} onChange={(e) => setCurPw(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
            <input type="password" placeholder="新しいパスワード" value={newPw} onChange={(e) => setNewPw(e.target.value)} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }} />
            <button type="button" disabled={busyPw} onClick={() => void savePw()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
              {busyPw ? '保存中…' : '変更'}
            </button>
          </div>
        </section>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          Google連携アカウントは、ここからパスワード変更できません。
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 13 }}>
        <Link href={`/${country}`} style={{ color: 'var(--muted)' }}>
          ← トップへ
        </Link>
      </div>
    </main>
  )
}


