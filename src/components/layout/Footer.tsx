'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { isCountry, type Country } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getCategoryLabel } from '@/lib/categories'
import { addGentleToUrl, getGentleFromUrl } from '@/lib/view-switch'
import { RegionLangSwitch } from './RegionLangSwitch'
import styles from './Footer.module.css'

function detectCountryFromPathname(pathname: string): Country | null {
  const seg = String(pathname || '').split('?')[0].split('#')[0].split('/')[1] || ''
  return isCountry(seg) ? seg : null
}

export function Footer() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const country = useMemo(() => detectCountryFromPathname(pathname), [pathname])

  const lang: Locale | null = country ? getLocaleForCountry(country) : null
  const t = country && lang ? getTranslationsForCountry(country, lang) : null
  const locale = lang === 'ja' ? 'ja' : 'en'
  const isJa = locale === 'ja'

  const gentle = getGentleFromUrl(`${pathname}?${searchParams.toString()}`)
  const withGentle = (url: string) => addGentleToUrl(url, gentle)

  const primaryLinks = useMemo(() => {
    if (!country) return []

    const labelTop = t?.nav.top ?? (isJa ? 'トップ' : 'Home')
    const labelToday = (t as any)?.nav?.today ?? (isJa ? '今日' : 'Today')
    const labelLatestNews = isJa ? '最新News' : 'Latest News'
    const labelDaily = t?.nav.daily ?? (isJa ? '日報' : 'Daily')

    return [
      { label: labelTop, href: `/${country}` },
      { label: labelToday, href: `/${country}/today` },
      { label: labelLatestNews, href: `/${country}/news` },
      // 朝刊は「当日ページ」へ（未生成なら /daily/today が案内を表示）
      { label: labelDaily, href: `/${country}/daily/today` },
      { label: getCategoryLabel('heartwarming', locale), href: `/${country}/category/heartwarming` },
      { label: getCategoryLabel('science_earth', locale), href: `/${country}/category/science_earth` },
      { label: getCategoryLabel('politics', locale), href: `/${country}/category/politics` },
      { label: getCategoryLabel('health', locale), href: `/${country}/category/health` },
      { label: getCategoryLabel('technology', locale), href: `/${country}/category/technology` },
      { label: getCategoryLabel('arts', locale), href: `/${country}/category/arts` },
      { label: getCategoryLabel('business', locale), href: `/${country}/category/business` },
      { label: getCategoryLabel('sports', locale), href: `/${country}/category/sports` },
      { label: isJa ? 'コラム' : 'Columns', href: `/${country}/columns` },
      { label: isJa ? '名言' : 'Quotes', href: `/${country}/quotes` },
    ]
  }, [country, isJa, locale, t])

  const secondaryLinks = useMemo(() => {
    const legalHref = country ? `/${country}/legal` : '/legal'
    return [
      { label: isJa ? 'このサイトについて' : 'About', href: '/about' },
      { label: isJa ? '利用規約・プライバシー' : 'Legal', href: legalHref },
    ]
  }, [country, isJa])

  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        {country ? (
          <nav className={styles.row} aria-label={isJa ? 'フッター主要リンク' : 'Footer primary links'}>
            {primaryLinks.map((x) => (
              <Link key={x.href} href={withGentle(x.href)} className={styles.link}>
                {x.label}
              </Link>
            ))}
          </nav>
        ) : null}

        <div className={styles.divider} />

        <nav className={styles.row} aria-label={isJa ? 'フッター情報リンク' : 'Footer info links'}>
          {country ? (
            <RegionLangSwitch currentCountry={country} className={styles.subLink} />
          ) : (
            <Link href={withGentle('/')} className={styles.subLink}>
              {isJa ? '地域と言語' : 'Region & Language'}
            </Link>
          )}
          {secondaryLinks.map((x) => (
            <Link key={x.href} href={withGentle(x.href)} className={styles.subLink}>
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className={styles.copyright}>© {year} The Gentle Light - by Misky</div>
    </footer>
  )
}


