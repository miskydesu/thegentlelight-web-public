'use client'

import { useEffect, useMemo } from 'react'
import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { isCountry } from '@/lib/tglApi'

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

export function GoogleAnalytics() {
  // GAはprod環境のみ（stg/devでは送信しない）
  // env名は既存の NEXT_PUBLIC_GA_ID に統一
  const GA_ID = process.env.NEXT_PUBLIC_GA_ID
  const pathname = usePathname() || ''
  const searchParams = useSearchParams()
  const qs = searchParams?.toString() || ''

  const isDnt =
    typeof window !== 'undefined' &&
    (window.navigator as any)?.doNotTrack === '1'

  const excluded = shouldExcludePath(pathname)
  const country = useMemo(() => getCountryFromPathname(pathname), [pathname])

  const pagePath = qs ? `${pathname}?${qs}` : pathname

  const isProdHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'thegentlelight.org' || window.location.hostname === 'www.thegentlelight.org')

  // 測定ID未設定 or DNT or prod以外 or 除外ページなら何もしない
  if (!GA_ID || isDnt || !isProdHost || excluded) return null

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


