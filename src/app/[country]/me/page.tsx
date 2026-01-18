'use client'

import { useParams, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getSession, setUserToken, updateGentleMode, updateGentleAllowImportantNews, changePassword, requestEmailVerify, requestEmailChange, confirmEmailChange } from '@/lib/userAuth'
import { addGentleToUrl, getPreferredGentle, setPreferredGentle, setPreferredGentleAllowImportantNews } from '@/lib/view-switch'
import styles from './me.module.css'

export default function MyPage() {
  const params = useParams<{ country: string }>()
  const country = params?.country || 'us'
  const router = useRouter()
  const isJp = country === 'jp'
  const showDev = process.env.NODE_ENV !== 'production'

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [googleSub, setGoogleSub] = useState<string | null>(null)
  const [gentleMode, setGentleMode] = useState<boolean | null>(null)
  const [gentleAllowImportant, setGentleAllowImportant] = useState<boolean>(true)
  const [currentGentle, setCurrentGentle] = useState<boolean>(false)
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string | null>(null)
  const [newEmail, setNewEmail] = useState('')
  const [emailToken, setEmailToken] = useState('')
  const [devInfo, setDevInfo] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyVerify, setBusyVerify] = useState(false)
  const [busyChange, setBusyChange] = useState(false)
  const [busyConfirmChange, setBusyConfirmChange] = useState(false)

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
      setGentleAllowImportant(Boolean((s.settings as any)?.gentle_allow_important_news ?? true))
      // 現在の表示モード（サイト全体に効く）: 固定設定がある場合はそれを優先、なければlocalStorageの最後状態
      const fixed = s.settings?.gentle_mode
      if (typeof fixed === 'boolean') setCurrentGentle(fixed)
      else setCurrentGentle(getPreferredGentle() ?? false)
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

  const saveGentleAllowImportant = async (next: boolean) => {
    setError(null)
    try {
      const r = await updateGentleAllowImportantNews(next)
      setGentleAllowImportant(r.settings.gentle_allow_important_news)
      setPreferredGentleAllowImportantNews(r.settings.gentle_allow_important_news)
    } catch (e: any) {
      setError(e?.message || '更新に失敗しました')
    }
  }

  const toggleCurrentGentle = (next: boolean) => {
    setCurrentGentle(next)
    setPreferredGentle(next)
    // その場で体感できるよう、トップへ遷移して反映（URLも揃える）
    router.push(addGentleToUrl(`/${country}`, next))
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
    setNotice(null)
    setDevInfo(null)
    setBusyVerify(true)
    try {
      const r = await requestEmailVerify()
      if (r.dev_verify_token) {
        setDevInfo(`dev_verify_token: ${r.dev_verify_token}`)
        setEmailToken(r.dev_verify_token)
      }
      // In production, dev token is not shown.
      // In dev, SMTP未設定だと「送れた風」になりやすいので、結果に応じて表示を出し分ける。
      const mailStatus = r.mail?.status
      if (mailStatus === 'skipped') {
        const reason = (r.mail as any)?.reason ? ` (${(r.mail as any).reason})` : ''
        setNotice(
          isJp
            ? `SMTPが未設定のためメール送信はスキップされました${reason}。下の（dev）確認ページから認証してください。`
            : `Email sending was skipped (SMTP not configured${reason}). Please verify via the (dev) link below.`
        )
      } else if (r.mail_error) {
        setNotice(
          isJp
            ? `メール送信でエラーが発生しました: ${r.mail_error}\n下の（dev）確認ページから認証してください。`
            : `Email sending failed: ${r.mail_error}\nPlease verify via the (dev) link below.`
        )
      } else {
      setNotice(isJp ? '認証メールを送信しました。受信箱をご確認ください。' : 'Verification email sent. Please check your inbox.')
      }
    } catch (e: any) {
      setError(e?.message || '送信に失敗しました')
    } finally {
      setBusyVerify(false)
    }
  }

  const requestChange = async () => {
    if (busyChange) return
    setError(null)
    setNotice(null)
    setDevInfo(null)
    setBusyChange(true)
    try {
      const r = await requestEmailChange(newEmail)
      if (r.dev_change_token) {
        setDevInfo(`dev_change_token: ${r.dev_change_token}`)
        setEmailToken(r.dev_change_token)
      }
      const mailStatus = r.mail?.status
      if (mailStatus === 'skipped') {
        const reason = (r.mail as any)?.reason ? ` (${(r.mail as any).reason})` : ''
        setNotice(
          isJp
            ? `SMTPが未設定のためメール送信はスキップされました${reason}。下の（dev）確認ページから変更を確定してください。`
            : `Email sending was skipped (SMTP not configured${reason}). Please confirm via the (dev) link below.`
        )
      } else if (r.mail_error) {
        setNotice(
          isJp
            ? `メール送信でエラーが発生しました: ${r.mail_error}\n下の（dev）確認ページから変更を確定してください。`
            : `Email sending failed: ${r.mail_error}\nPlease confirm via the (dev) link below.`
        )
      } else {
        setNotice(isJp ? '確認メールを送信しました。受信箱をご確認ください。' : 'Confirmation email sent. Please check your inbox.')
      }
    } catch (e: any) {
      setError(e?.message || '送信に失敗しました')
    } finally {
      setBusyChange(false)
    }
  }

  const confirmChange = async () => {
    if (busyConfirmChange) return
    setError(null)
    setDevInfo(null)
    setBusyConfirmChange(true)
    try {
      await confirmEmailChange(emailToken)
      await load()
    } catch (e: any) {
      setError(e?.message || '変更に失敗しました')
    } finally {
      setBusyConfirmChange(false)
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
      <h1 style={{ fontSize: '1.5rem', marginBottom: 12 }}>{isJp ? 'マイページ' : 'My page'}</h1>

      {error ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid #f5c2c7', background: '#f8d7da', color: '#842029', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      ) : null}
      {notice ? (
        <div style={{ marginBottom: 12, padding: '10px 12px', border: '1px solid rgba(0,0,0,0.08)', background: '#fff', color: 'var(--text)', borderRadius: 6, whiteSpace: 'pre-wrap' }}>
          {notice}
        </div>
      ) : null}

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <div style={{ fontWeight: 800 }}>{isJp ? 'ログイン情報' : 'Login info'}</div>
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
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          {googleSub ? (isJp ? 'Google連携: あり' : 'Google linked: yes') : isJp ? 'Google連携: なし' : 'Google linked: no'}
        </div>
        <div style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
          {isJp ? 'メール認証' : 'Email verification'}:{' '}
          {emailVerifiedAt ? (isJp ? `済（${new Date(emailVerifiedAt).toLocaleString()}）` : `Verified (${new Date(emailVerifiedAt).toLocaleString()})`) : isJp ? '未' : 'Not verified'}
        </div>
        {!emailVerifiedAt ? (
          <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              disabled={busyVerify}
              onClick={() => void sendVerify()}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', background: '#fff', cursor: busyVerify ? 'not-allowed' : 'pointer', opacity: busyVerify ? 0.6 : 1 }}
            >
              {busyVerify ? (isJp ? '送信中…' : 'Sending…') : isJp ? '認証メールを送る' : 'Send verification email'}
            </button>
            {showDev ? (
              <Link href={`/${country}/verify-email?token=${encodeURIComponent(emailToken)}`} style={{ fontSize: 13, color: 'var(--muted)' }}>
                {isJp ? '（dev）確認ページへ' : '(dev) Verify page'}
              </Link>
            ) : null}
          </div>
        ) : null}
        {showDev && devInfo ? <div style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)', whiteSpace: 'pre-wrap' }}>{devInfo}</div> : null}
      </section>

      {/* 1) Gentle Mode 設定（今の表示を切り替える） */}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? '負担を減らす（Gentle Mode） 設定' : 'Gentle Mode'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10, lineHeight: 1.55 }}>
          {isJp
            ? '表示の基準を切り替えます。「負担を減らす（Gentle Mode）」では、心の負担が大きい可能性がある話題を抑えます（数値は表示しません）。'
            : 'Switch the display rule. Gentle Mode reduces potentially upsetting topics based on our evaluation and filtering policy (we do not show raw scores).'}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => toggleCurrentGentle(true)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: currentGentle ? '1px solid #000' : '1px solid rgba(0,0,0,0.18)',
              background: currentGentle ? '#000' : '#fff',
              color: currentGentle ? '#fff' : 'var(--text)',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isJp ? 'ON' : 'ON'}
          </button>
          <button
            type="button"
            onClick={() => toggleCurrentGentle(false)}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: !currentGentle ? '1px solid #000' : '1px solid rgba(0,0,0,0.18)',
              background: !currentGentle ? '#000' : '#fff',
              color: !currentGentle ? '#fff' : 'var(--text)',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {isJp ? 'OFF' : 'OFF'}
          </button>
        </div>
        <div className="tglMuted" style={{ marginTop: 10, fontSize: 12 }}>
          {isJp ? '※この切り替えは、サイト全体の表示に反映されます。' : 'Applies to the whole site.'}
        </div>
      </section>

      {/* 2) Gentle Mode 保持設定（ログイン時の固定/引き継ぎ） */}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? '負担を減らす（Gentle Mode） 保持設定' : 'Gentle Mode persistence'}</div>
        <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 10 }}>
          {isJp ? 'ON / OFF 固定、または最後の状態を引き継ぐ（サイトで切り替えた状態）を選べます。（対象：負担を減らす（Gentle Mode））' : 'Choose ON, OFF, or inherit the last state you used on the site.'}
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
              <div className={styles.gentleRadioDesc}>{isJp ? 'ログイン時「負担を減らす（Gentle Mode）」をONに固定' : 'Always show with Gentle Mode ON'}</div>
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
              <div className={styles.gentleRadioDesc}>{isJp ? 'ログイン時「負担を減らす（Gentle Mode）」をOFFに固定' : 'Always show with Gentle Mode OFF'}</div>
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
              <div className={styles.gentleRadioDesc}>{isJp ? 'サイトで最後に切り替えた状態を引き継ぐ' : 'Use the last state you toggled on the site'}</div>
            </div>
            <span className={styles.gentleRadioDot} aria-hidden="true" />
          </label>
        </div>
      </section>

      {/* 3) 重要ニュースの表示設定 */}
      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? '重要ニュースの表示設定' : 'Important news visibility'}</div>
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={gentleAllowImportant}
            onChange={(e) => void saveGentleAllowImportant(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <div>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>
              {isJp ? '負担を減らす（Gentle Mode）でも重要ニュースだけは表示する' : 'Show important news even in Gentle Mode'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.55 }}>
              {isJp
                ? 'おすすめはONです。心の負担に注意の可能性がある重要ニュースを、「負担を減らす（Gentle Mode）」でも最小限だけ残します。'
                : 'Recommended ON. Keeps only the most important potentially upsetting news in Gentle Mode.'}
            </div>
          </div>
        </label>
      </section>

      <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 14 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? 'ID（メールアドレス）変更' : 'Change email address'}</div>
        <div style={{ display: 'grid', gap: 10 }}>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder={isJp ? '新しいメールアドレス' : 'New email address'}
            style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
          />
          <button
            type="button"
            disabled={busyChange}
            onClick={() => void requestChange()}
            style={{
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid rgba(0,0,0,0.18)',
              background: '#fff',
              fontWeight: 800,
              cursor: busyChange ? 'not-allowed' : 'pointer',
              opacity: busyChange ? 0.6 : 1,
            }}
          >
            {busyChange ? (isJp ? '送信中…' : 'Sending…') : isJp ? '変更用メールを送る' : 'Send change-email link'}
          </button>
          {showDev ? (
            <>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  value={emailToken}
                  onChange={(e) => setEmailToken(e.target.value)}
                  placeholder={isJp ? '（dev）トークン' : '(dev) Token'}
                  style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)', flex: '1 1 240px' }}
                />
                <button
                  type="button"
                  disabled={busyConfirmChange}
                  onClick={() => void confirmChange()}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #000',
                    background: '#000',
                    color: '#fff',
                    fontWeight: 800,
                    cursor: busyConfirmChange ? 'not-allowed' : 'pointer',
                    opacity: busyConfirmChange ? 0.75 : 1,
                  }}
                >
                  {busyConfirmChange ? (isJp ? '確定中…' : 'Confirming…') : isJp ? '変更を確定' : 'Confirm change'}
                </button>
              </div>
              <Link href={`/${country}/confirm-email-change?token=${encodeURIComponent(emailToken)}`} style={{ fontSize: 13, color: 'var(--muted)' }}>
                {isJp ? '（dev）確認ページへ' : '(dev) Confirm page'}
              </Link>
            </>
          ) : (
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>
              {isJp ? '確認メール内のリンクから手続きを完了してください。' : 'Please complete the change via the link in the email.'}
            </div>
          )}
        </div>
      </section>

      {!googleSub ? (
        <section style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 8, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>{isJp ? 'パスワード変更' : 'Change password'}</div>
          <div style={{ display: 'grid', gap: 10 }}>
            <input
              type="password"
              placeholder={isJp ? '現在のパスワード' : 'Current password'}
              value={curPw}
              onChange={(e) => setCurPw(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
            <input
              type="password"
              placeholder={isJp ? '新しいパスワード' : 'New password'}
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.18)' }}
            />
            <button type="button" disabled={busyPw} onClick={() => void savePw()} style={{ padding: '10px 12px', borderRadius: 6, border: '1px solid #000', background: '#000', color: '#fff', fontWeight: 800 }}>
              {busyPw ? (isJp ? '保存中…' : 'Saving…') : isJp ? '変更' : 'Update'}
            </button>
          </div>
        </section>
      ) : (
        <div style={{ color: 'var(--muted)', fontSize: 13 }}>
          {isJp ? 'Google連携アカウントは、ここからパスワード変更できません。' : 'Google-linked accounts cannot change password here.'}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: 13 }}>
        <Link href={`/${country}`} style={{ color: 'var(--muted)' }}>
          {isJp ? '← トップへ' : '← Back to top'}
        </Link>
      </div>
    </main>
  )
}


