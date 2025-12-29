'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { COUNTRIES, type Country } from '@/lib/tglApi'
import { getCountrySwitchUrl } from '@/lib/country-switch'
import { getLangFromUrl, type Locale } from '@/lib/lang-switch'

export interface CountrySwitchProps {
  currentCountry: Country
}

/**
 * CountrySwitch: 国切替リンク（カテゴリ維持→国トップのフォールバック）
 * langパラメータも保持する
 */
export function CountrySwitch({ currentCountry }: CountrySwitchProps) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // カテゴリを抽出
  const categoryMatch = pathname.match(/\/category\/([^/]+)/)
  const category = categoryMatch ? categoryMatch[1] : undefined

  // 現在の言語を取得
  const currentLang: Locale | null = (() => {
    const langParam = searchParams.get('lang')
    if (langParam === 'en' || langParam === 'ja') return langParam
    return null
  })()

  return (
    <>
      {COUNTRIES.map((c) => {
        if (c.code === currentCountry) return null
        const switchUrl = getCountrySwitchUrl(currentCountry, c.code, pathname, category, currentLang)
        return (
          <Link
            key={c.code}
            href={switchUrl}
            className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
          >
            {c.label}
          </Link>
        )
      })}
    </>
  )
}

