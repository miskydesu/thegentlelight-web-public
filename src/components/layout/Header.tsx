'use client'

import Link from 'next/link'
import { COUNTRIES, isCountry, type Country } from '@/lib/tglApi'
import { cn } from '@/lib/cn'
import { useTranslations, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CountrySwitch } from './CountrySwitch'
import { ViewSwitch } from './ViewSwitch'

export interface HeaderProps {
  country?: Country | null
  className?: string
}

/**
 * Header: ロゴ、国タブ、検索
 * - 左：ロゴ（常にホームへ）
 * - 中：国タブ（US / CA / UK / JP）
 * - 右：国切替・言語切替
 */
export function Header({ country, className }: HeaderProps) {
  // メイン言語固定（URLの ?lang= 切替は廃止）
  const lang: Locale | null = country ? getLocaleForCountry(country) : null
  const t = country && lang ? useTranslations(country, lang) : null

  return (
    <header
      className={cn(
        'sticky top-0 z-10',
        'bg-[rgba(255,255,255,0.9)] backdrop-blur-[8px]',
        'border-b border-[var(--border)]',
        className
      )}
    >
      <div
        className={cn(
          'max-w-[1100px] mx-auto',
          'px-5 py-3.5',
          'flex items-center justify-between gap-4'
        )}
      >
        <div className="flex gap-3 items-center flex-wrap">
          <Link href="/" className="font-extrabold text-[var(--text)]">
            The Gentle Light
          </Link>
          {country && (
            <span className="inline-flex items-center rounded-full border border-[var(--border)] px-2 py-0.5 text-xs text-[var(--text)] bg-[var(--surface)]">
              {country.toUpperCase()}
            </span>
          )}
        </div>

        <nav className="flex gap-3 flex-wrap items-center text-[var(--text)]">
          {country && t && lang ? (
            <>
              <Link
                href={`/${country}`}
                className="text-sm hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors"
              >
                {t.nav.top}
              </Link>
              <Link
                href={`/${country}/today`}
                className="text-sm hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors"
              >
                {t.nav.today}
              </Link>
              <Link
                href={`/${country}/news`}
                className="text-sm hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors"
              >
                {t.nav.news}
              </Link>
              <Link
                href={`/${country}/daily`}
                className="text-sm hover:text-[var(--accent)] hover:underline underline-offset-4 transition-colors"
              >
                {t.nav.daily}
              </Link>
            </>
          ) : null}
          <span className="text-[var(--muted)] opacity-60">|</span>
          {country ? (
            <>
              <CountrySwitch currentCountry={country} />
              <span className="text-[var(--muted)] opacity-60">|</span>
              <ViewSwitch />
            </>
          ) : (
            COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={`/${c.code}`}
                className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors"
              >
                {c.label}
              </Link>
            ))
          )}
        </nav>
      </div>
    </header>
  )
}

