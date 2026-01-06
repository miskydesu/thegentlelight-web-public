'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getUserToken, getSession, setUserToken } from '@/lib/userAuth'
import { setPreferredGentle } from '@/lib/view-switch'

export function UserStatus({ country }: { country: string }) {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState<string | null>(null)
  const isJp = country === 'jp'

  useEffect(() => {
    const run = async () => {
      setLoading(true)
      try {
        const token = getUserToken()
        if (!token) {
          setEmail(null)
          return
        }
        const s = await getSession()
        setEmail(s.user?.email ?? null)
        // ユーザー設定でON/OFF固定されている場合は、サイト全体の持ち回り挙動に合わせてlocalStorageへ反映
        if (typeof s.settings?.gentle_mode === 'boolean') setPreferredGentle(s.settings.gentle_mode)
      } catch (e: any) {
        // 401（本当に無効）以外はトークンを消さない（自動ログインCookieが消えるのを防ぐ）
        const status = e?.status
        const msg = String(e?.message || '')
        if (status === 401 || msg.toLowerCase().includes('unauthorized')) {
          setUserToken(null)
        }
        setEmail(null)
      } finally {
        setLoading(false)
      }
    }
    void run()
  }, [])

  if (loading) return <span style={{ fontSize: 13, color: 'var(--muted)' }}>…</span>
  if (!email) {
    return (
      <Link
        href={`/${country}/login`}
        style={{ fontSize: 13, color: 'var(--muted)', textDecoration: 'none' }}
      >
        Sign up / Login
      </Link>
    )
  }
  return (
    <Link
      href={`/${country}/me`}
      style={{ fontSize: 13, color: 'var(--text)', textDecoration: 'none', fontWeight: 700 }}
      title={email}
    >
      {isJp ? 'マイページ' : 'My page'}
    </Link>
  )
}


