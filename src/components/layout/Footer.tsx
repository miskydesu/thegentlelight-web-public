'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMemo } from 'react'
import { isCountry, type Country } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { RegionLangSwitch } from './RegionLangSwitch'
import { ViewSwitch } from './ViewSwitch'
import styles from './Footer.module.css'

function detectCountryFromPathname(pathname: string): Country | null {
  const seg = String(pathname || '').split('?')[0].split('#')[0].split('/')[1] || ''
  // /en は言語ページ（英語）。Footerは国が必要なので、便宜上 us として扱う（表示は英語）。
  if (seg === 'en') return 'us'
  return isCountry(seg) ? seg : null
}

export function Footer() {
  const pathname = usePathname()
  const country = useMemo(() => detectCountryFromPathname(pathname || ''), [pathname])

  const lang: Locale | null = country ? getLocaleForCountry(country) : null
  const t = country && lang ? getTranslationsForCountry(country, lang) : null
  const locale = lang === 'ja' ? 'ja' : 'en'
  const isJa = locale === 'ja'


  const primaryLinks = useMemo(() => {
    if (!country) return []

    const isEnLangPage = String(pathname || '').split('?')[0].split('#')[0].startsWith('/en/')
    const isEnEdition = country === 'us' || country === 'ca' || country === 'uk'
    const columnsHref = isEnLangPage || isEnEdition ? '/en/columns' : `/${country}/columns`
    const quotesHref = isEnLangPage || isEnEdition ? '/en/quotes' : `/${country}/quotes`

    const labelRoot = isJa ? 'ホーム' : 'Home (Global)'
    const labelDaily = isJa ? '今朝の朝刊' : 'Morning Briefing'
    const labelNews = isJa ? 'ニュース一覧' : 'News Index'
    return [
      { label: labelRoot, href: '/', isPrimary: true },
      { label: labelDaily, href: `/${country}/daily` },
      { label: labelNews, href: `/${country}/news` },
      { label: isJa ? '心温まる話' : 'Heartwarming', href: `/${country}/category/heartwarming` },
      { label: isJa ? 'コラム' : 'Columns', href: columnsHref },
      { label: isJa ? '名言' : 'Quotes', href: quotesHref },
    ]
  }, [country, isJa, pathname])

  const secondaryLinks = useMemo(() => {
    const legalHref = country ? `/${country}/legal` : '/legal'
    return [
      { label: isJa ? 'サイトについて' : 'About', href: '/about' },
      { label: isJa ? '利用規約・プライバシー' : 'Legal', href: legalHref },
    ]
  }, [country, isJa])

  const year = new Date().getFullYear()

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <div className={styles.brandTitle}>The Gentle Light</div>
            <div className={styles.brandRight}>
              <ViewSwitch labelJa="負担を減らす（Gentle Mode）" />
            </div>
          </div>
          <div className={styles.brandTagline}>
            {isJa ? '煽らない要点で、世界の流れを静かに整理します。' : 'Calm, non-sensational news at a gentle pace.'}
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.grid}>
          <div className={styles.col}>
            <div className={styles.colTitle}>{isJa ? '読む' : 'Read'}</div>
            <nav className={styles.links} aria-label={isJa ? 'フッターメインリンク' : 'Footer main links'}>
              {primaryLinks.map((x) => (
                <Link key={x.href} href={x.href} className={`${styles.pill} ${x.isPrimary ? styles.pillPrimary : ''}`}>
                  {x.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className={styles.col}>
            <div className={styles.colTitle}>{isJa ? 'このサイト' : 'About'}</div>
            <nav className={styles.links} aria-label={isJa ? 'フッター情報リンク' : 'Footer info links'}>
              {country ? (
                <RegionLangSwitch currentCountry={country} className={styles.pill} />
              ) : (
                <Link href="/" className={styles.pill}>
                  {isJa ? '地域と言語' : 'Region & Language'}
                </Link>
              )}
              {secondaryLinks.map((x) => (
                <Link key={x.href} href={x.href} className={styles.pill}>
                  {x.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {country ? (
          <div className={styles.col}>
            <div className={styles.colTitle}>{isJa ? '迷ったら' : 'Start here'}</div>
            <div className={styles.links}>
              <Link className={styles.pill} href={`/${country}/daily`}>
                {isJa ? '朝刊を見る' : 'Briefings'}
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className={styles.copyright}>© {year} The Gentle Light - by Misky</div>
    </footer>
  )
}


