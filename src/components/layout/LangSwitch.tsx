'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type Country } from '@/lib/tglApi'
import { getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getLangSwitchedUrl, getLangFromUrl, setPreferredLang } from '@/lib/lang-switch'
import { cn } from '@/lib/cn'

export interface LangSwitchProps {
  country: Country
}

/**
 * LangSwitch: 言語切替UI（クエリパラメータ方式）
 * 国のメイン言語以外は ?lang= で切替
 */
export function LangSwitch({ country }: LangSwitchProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const defaultLang = getLocaleForCountry(country)
  const currentLang = getLangFromUrl(`${pathname}?${searchParams.toString()}`, country)
  
  const handleLangChange = (targetLang: Locale) => {
    if (targetLang === currentLang) return
    
    const currentPath = `${pathname}?${searchParams.toString()}`
    const newUrl = getLangSwitchedUrl(currentPath, country, targetLang)
    
    setPreferredLang(targetLang)
    // window.location.hrefを使って完全にリロード
    // これによりサーバーコンポーネントが確実に再レンダリングされる
    window.location.href = newUrl
  }

  return (
    <div className="flex gap-2 items-center">
      <button
        onClick={() => handleLangChange('en')}
        className={cn(
          'text-sm transition-colors',
          currentLang === 'en'
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
      >
        EN
      </button>
      <span className="text-[var(--muted)] opacity-60">|</span>
      <button
        onClick={() => handleLangChange('ja')}
        className={cn(
          'text-sm transition-colors',
          currentLang === 'ja'
            ? 'text-[var(--text)] font-medium'
            : 'text-[var(--muted)] hover:text-[var(--text)]'
        )}
      >
        JA
      </button>
    </div>
  )
}

