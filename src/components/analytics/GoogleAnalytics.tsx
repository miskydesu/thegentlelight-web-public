'use client'

import { useEffect, useMemo, useState } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { isCountry } from '@/lib/tglApi'
import type { UserSession } from '@/lib/userAuth'
import { getUserToken, userFetchJson } from '@/lib/userAuth'

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: any[]) => void
  }
}

function shouldExcludePath(pathname: string): boolean {
  // 内部ページは計測ノイズになりがちなので除外
  if (pathname === '/test' || pathname.startsWith('/test/')) return true
  if (pathname === '/sentry-test' || pathname.startsWith('/sentry-test/')) return true
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return true
  return false
}

function getCountryFromPathname(pathname: string): string | null {
  const seg = (pathname.split('/')[1] || '').trim()
  if (!seg) return null
  return isCountry(seg) ? seg : null
}

function hasAdminToken(): boolean {
  // NOTE: 管理画面ログインは localStorage('tgl_admin_token') に保持される
  // これが存在する場合は「管理者がログイン中」とみなし、GA計測を止める
  if (typeof window === 'undefined') return false
  try {
    return Boolean(window.localStorage.getItem('tgl_admin_token'))
  } catch {
    return false
  }
}

function hasUserToken(): boolean {
  // NOTE: 通常ユーザーログインは localStorage('tgl_user_token')（+ remember-me cookie）に保持される
  // role=admin の場合は GA 計測を止めたいので、「tokenがある場合は role を確認する」
  return Boolean(getUserToken())
}

export function GoogleAnalytics() {
  // GAはprod環境のみ（stg/devでは送信しない）
  // env名は既存の NEXT_PUBLIC_GA_ID に統一
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const qs = searchParams?.toString() || ''

  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => hasAdminToken())
  const [userRoleState, setUserRoleState] = useState<'unknown' | 'admin' | 'nonadmin'>(() =>
    hasUserToken() ? 'unknown' : 'nonadmin'
  )

  // 別タブで admin ログイン/ログアウトした場合も追従して計測を止める
  useEffect(() => {
    if (typeof window === 'undefined') return
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'tgl_admin_token') return
      setIsAdminLoggedIn(hasAdminToken())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  // 通常ユーザー（Neon users）の role=admin 判定
  // - token が無ければ即 nonadmin
  // - token がある場合は /v1/auth/session で role を確認する（判定できるまで GA は出さない）
  // - 別タブでログイン/ログアウトした場合も追従（localStorageのtoken変化）
  useEffect(() => {
    if (typeof window === 'undefined') return

    let cancelled = false

    async function refreshRole() {
      const token = getUserToken()
      if (!token) {
        if (!cancelled) setUserRoleState('nonadmin')
        return
      }
      if (!cancelled) setUserRoleState('unknown')
      try {
        const s = await userFetchJson<UserSession>('/v1/auth/session', { timeoutMs: 3000 })
        const role = String(s?.user?.role || '').toLowerCase()
        if (cancelled) return
        setUserRoleState(role === 'admin' ? 'admin' : 'nonadmin')
      } catch (e: any) {
        // 401 は「未ログイン」と同等（古いtoken等）
        const status = Number(e?.status || 0)
        if (cancelled) return
        if (status === 401) setUserRoleState('nonadmin')
        else setUserRoleState('unknown') // 判定不能時は安全側に倒してGA停止（漏れ防止）
      }
    }

    // 初回
    refreshRole()

    // 別タブでログイン/ログアウトした場合（localStorageのtoken変化）に追従
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'tgl_user_token') return
      refreshRole()
    }
    window.addEventListener('storage', onStorage)
    return () => {
      cancelled = true
      window.removeEventListener('storage', onStorage)
    }
  }, [])

  const isDnt =
    typeof window !== 'undefined' &&
    (window.navigator as any)?.doNotTrack === '1'

  const excluded = shouldExcludePath(pathname)
  const country = useMemo(() => getCountryFromPathname(pathname), [pathname])

  const pagePath = qs ? `${pathname}?${qs}` : pathname

  const isProdHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'thegentlelight.org' || window.location.hostname === 'www.thegentlelight.org')

  // 優先順位:
  // - role=admin と判定できた場合のみ除外（計測しない）
  // - 判定できない/失敗(unknown)の場合は計測してOK
  const excludeByUserRole = userRoleState === 'admin'

  // 測定ID未設定 or DNT or prod以外 or 除外ページ or 管理者ログイン中 なら何もしない
  if (!GA_ID || isDnt || !isProdHost || excluded || isAdminLoggedIn || excludeByUserRole) return null

  // 初期化（gtag.js）と config（send_page_view=false）を出す
  // page_view は route change ごとに手動送信する
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = window.gtag || gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { send_page_view: false });
        `}
      </Script>

      <GAPageView gaId={GA_ID} pagePath={pagePath} country={country} />
    </>
  )
}

function GAPageView({ gaId, pagePath, country }: { gaId: string; pagePath: string; country: string | null }) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!window.gtag) return

    const c = country || '(none)'

    // user_property: 国（ユーザースコープで国別集計したい場合用）
    window.gtag('set', 'user_properties', { country: c })

    // event param: 国（イベントスコープでページ別/国別に見たい場合用）
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_location: window.location.href,
      page_title: document.title,
      country: c,
    })

    // 念のため config にも反映（send_page_view=false のまま）
    window.gtag('config', gaId, {
      page_path: pagePath,
      country: c,
    })
  }, [gaId, pagePath, country])

  return null
}


