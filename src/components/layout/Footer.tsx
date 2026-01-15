'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { isCountry, type Country } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
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

  const country = useMemo(() => detectCountryFromPathname(pathname || ''), [pathname])

  const lang: Locale | null = country ? getLocaleForCountry(country) : null
  const t = country && lang ? getTranslationsForCountry(country, lang) : null
  const locale = lang === 'ja' ? 'ja' : 'en'
  const isJa = locale === 'ja'

  const gentle = getGentleFromUrl(`${pathname || ''}?${searchParams?.toString() || ''}`)
  const withGentle = (url: string) => addGentleToUrl(url, gentle)

  const primaryLinks = useMemo(() => {
    if (!country) return []

    return [
      { label: isJa ? 'ニュース' : 'News', href: `/${country}/news` },
      { label: isJa ? 'コラム' : 'Columns', href: `/${country}/columns` },
      { label: isJa ? '名言' : 'Quotes', href: `/${country}/quotes` },
    ]
  }, [country, isJa])

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
          <>
            <nav className={styles.row} aria-label={isJa ? 'フッター補助リンク' : 'Footer support links'}>
            {primaryLinks.map((x) => (
              <Link key={x.href} href={withGentle(x.href)} className={styles.link}>
                {x.label}
              </Link>
            ))}
          </nav>

            <div className={styles.divider} />
          </>
        ) : null}

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


