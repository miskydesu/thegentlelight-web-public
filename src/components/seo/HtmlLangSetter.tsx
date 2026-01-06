'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

function getLangFromPathname(pathname: string | null): string {
  const p = pathname || '/'
  const seg = (p.split('/')[1] || '').trim().toLowerCase()
  if (seg === 'jp') return 'ja-JP'
  if (seg === 'uk') return 'en-GB'
  if (seg === 'ca') return 'en-CA'
  if (seg === 'us') return 'en-US'

  // `/`（国選択ページ）はブラウザ言語で最小限判定
  const navLang = typeof navigator !== 'undefined' ? navigator.language || '' : ''
  return navLang.toLowerCase().startsWith('ja') ? 'ja-JP' : 'en-US'
}

/**
 * Cloudflare Pages (next-on-pages) では middleware でセットした request header が
 * Server Components から読めないケースがあり、SSR の `<html lang>` が誤ることがある。
 * その対策として、クライアント側で pathname に合わせて `<html lang>` を確実に補正する。
 */
export function HtmlLangSetter() {
  const pathname = usePathname()

  useEffect(() => {
    const lang = getLangFromPathname(pathname)
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang
    }
  }, [pathname])

  return null
}


