'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo } from 'react'
import { COUNTRIES, isCountry, type Country } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getCategoryLabel } from '@/lib/categories'
import { addGentleToUrl, getGentleFromUrl, getPreferredGentle } from '@/lib/view-switch'
import { getCountrySwitchUrl } from '@/lib/country-switch'
import { RegionLangSwitch } from './RegionLangSwitch'
import { ViewSwitch } from './ViewSwitch'
import { UserStatus } from './UserStatus'
import * as Dialog from '@radix-ui/react-dialog'
import styles from './Header.module.css'

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
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // メイン言語固定（URLの ?lang= 切替は廃止）
  const lang: Locale | null = country ? getLocaleForCountry(country) : null
  const t = country && lang ? getTranslationsForCountry(country, lang) : null
  const locale = lang === 'ja' ? 'ja' : 'en'
  const isJa = locale === 'ja'
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  // gentle=1 を「一度設定したら持ち回り」にする
  // - URLにgentleが無い場合、localStorageに保存された前回設定を見て gentle=1 を自動付与
  // - これにより、リンク側でgentleを付け忘れてもページ遷移でリセットされない
  useEffect(() => {
    const qs = searchParams.toString()
    const currentUrl = `${pathname}${qs ? `?${qs}` : ''}`
    const hasGentleParam = searchParams.get('gentle') != null
    if (hasGentleParam) return

    const preferred = getPreferredGentle()
    if (preferred !== true) return

    const nextUrl = addGentleToUrl(currentUrl, true)
    if (nextUrl !== currentUrl) {
      // server components を確実に切り替えるため full reload
      window.location.replace(nextUrl)
    }
  }, [pathname, searchParams])

  const gentle = getGentleFromUrl(`${pathname}?${searchParams.toString()}`)
  const withGentle = (url: string) => addGentleToUrl(url, gentle)

  // mobile menu: Region & Language items (Dialog内に直接表示したいので、RegionLangSwitchのロジックをここでも生成)
  const regionItems = useMemo(() => {
    if (!country) return []
    const gentleParam = searchParams.get('gentle')
    const gentle2 = gentleParam === '1' || gentleParam === 'true'
    const categoryMatch = pathname.match(/\/category\/([^/]+)/)
    const category = categoryMatch ? categoryMatch[1] : undefined

    const labelsJa: Record<Country, string> = {
      us: 'アメリカ合衆国（英語）',
      ca: 'カナダ（英語）',
      uk: 'イギリス（英語）',
      jp: '日本（日本語）',
    }
    const labelsEn: Record<Country, string> = {
      us: 'United States (English)',
      ca: 'Canada (English)',
      uk: 'United Kingdom (English)',
      jp: 'Japan (Japanese)',
    }
    const isJa2 = country === 'jp'
    return COUNTRIES.map((c) => {
      const to = c.code
      const baseUrl = getCountrySwitchUrl(country, to, pathname, category, null)
      const href = addGentleToUrl(baseUrl, gentle2)
      return { code: to, label: isJa2 ? labelsJa[to] : labelsEn[to], href, active: to === country }
    })
  }, [country, pathname, searchParams])

  const getMenuTextColor = (href: string): string | null => {
    if (!country) return null
    const clean = String(href || '').split('?')[0] || ''
    if (clean === `/${country}/columns`) return '#d63384' // pink
    if (clean === `/${country}/quotes`) return '#1f8a5b' // green
    return null
  }

  const isActiveHref = (href: string): boolean => {
    const clean = String(href || '').split('?')[0] || ''
    if (!clean) return false
    // 国トップは prefix 判定にすると常に当たるので「完全一致」のみ
    if (country && clean === `/${country}`) return pathname === clean
    return pathname === clean || pathname.startsWith(`${clean}/`)
  }

  const logoSrc = useMemo(() => {
    const key = isJa ? 'assets/brand/logo_ja.png' : 'assets/brand/logo_en.png'
    if (!imageBase) return `/${key}`
    const b = imageBase.replace(/\/+$/, '')
    return `${b}/${key}`
  }, [imageBase, isJa])

  const menuItems = useMemo(() => {
    if (!country) return []
    const labelTop = t?.nav.top ?? (isJa ? 'トップ' : 'Home')
    const labelNews = t?.nav.news ?? (isJa ? 'ニュース' : 'News')
    const labelDaily = t?.nav.daily ?? (isJa ? '日報' : 'Daily')
    return [
      { kind: 'link' as const, label: labelTop, href: `/${country}` },
      { kind: 'link' as const, label: labelNews, href: `/${country}/news` },
      // 朝刊は「当日ページ」へ（未生成なら /daily/today が案内を表示）
      { kind: 'link' as const, label: labelDaily, href: `/${country}/daily/today` },
      { kind: 'sep' as const },
      { kind: 'link' as const, label: getCategoryLabel('heartwarming', locale), href: `/${country}/category/heartwarming` },
      { kind: 'link' as const, label: getCategoryLabel('science_earth', locale), href: `/${country}/category/science_earth` },
      { kind: 'link' as const, label: getCategoryLabel('politics', locale), href: `/${country}/category/politics` },
      { kind: 'link' as const, label: getCategoryLabel('health', locale), href: `/${country}/category/health` },
      { kind: 'link' as const, label: getCategoryLabel('technology', locale), href: `/${country}/category/technology` },
      { kind: 'link' as const, label: getCategoryLabel('arts', locale), href: `/${country}/category/arts` },
      { kind: 'link' as const, label: getCategoryLabel('business', locale), href: `/${country}/category/business` },
      { kind: 'link' as const, label: getCategoryLabel('sports', locale), href: `/${country}/category/sports` },
      { kind: 'sep' as const },
      { kind: 'link' as const, label: isJa ? 'コラム' : 'Columns', href: `/${country}/columns` },
      { kind: 'sep' as const },
      { kind: 'link' as const, label: isJa ? '名言' : 'Quotes', href: `/${country}/quotes` },
      { kind: 'sep' as const },
      { kind: 'link' as const, label: isJa ? 'サイトの説明' : 'About', href: `/${country}/about` },
    ]
  }, [country, isJa, locale, t])

  return (
    <header
      className={className}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: '#fff',
      }}
    >
      <div
        style={{
          maxWidth: '100%',
          margin: 0,
          padding: '14px 20px',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          columnGap: 16,
          rowGap: 8,
        }}
      >
        {/* 左：モバイル時だけハンバーガー */}
        <div>
          {country ? (
            <div className={styles.mobileOnly}>
              <Dialog.Root>
                <Dialog.Trigger asChild>
                  <button type="button" className={styles.hamburgerButton} aria-label={isJa ? 'メニュー' : 'Menu'}>
                    <span className={styles.hamburgerLines}>
                      <span />
                    </span>
                  </button>
                </Dialog.Trigger>

                <Dialog.Portal>
                  <Dialog.Overlay
                    style={{
                      position: 'fixed',
                      inset: 0,
                      zIndex: 50,
                      background: 'rgba(0,0,0,0.4)',
                    }}
                  />
                  <Dialog.Content
                    style={{
                      position: 'fixed',
                      left: '50%',
                      top: 12,
                      transform: 'translateX(-50%)',
                      zIndex: 51,
                      width: 'calc(100vw - 2rem)',
                      maxWidth: 560,
                      maxHeight: 'calc(100vh - 24px)',
                      overflowY: 'auto',
                      borderRadius: 12,
                      background: '#fff',
                      border: '1px solid var(--border)',
                      boxShadow: '0 18px 50px rgba(0,0,0,0.22), 0 6px 16px rgba(0,0,0,0.12)',
                      padding: 16,
                    }}
                  >
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        aria-label={isJa ? '閉じる' : 'Close'}
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          width: 34,
                          height: 34,
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: '#fff',
                          color: 'var(--text)',
                          cursor: 'pointer',
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </Dialog.Close>

                    <div style={{ paddingRight: 44, marginBottom: 12 }}>
                      <Dialog.Title style={{ fontWeight: 800 }}>{isJa ? 'メニュー' : 'Menu'}</Dialog.Title>
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.mobileMenuRow} style={{ marginBottom: 14 }}>
                      <div style={{ fontWeight: 800 }}>{isJa ? 'Gentle Mode' : 'Gentle Mode'}</div>
                      <ViewSwitch />
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.55, marginTop: -6, marginBottom: 14 }}>
                      {(isJa
                        ? '当サイトでは、心の負担が少ないニュースを優先して表示しております。更にGentleModeをONにする事で負担が大きいニュースを自動的に非表示にすることが出来ます。'
                        : 'This site prioritizes stories that may feel less emotionally intense.\nTurn Gentle Mode ON to automatically hide stories that may feel more upsetting.'
                      )
                        .split('\n')
                        .map((line, idx) => (
                          <div key={idx}>{line}</div>
                        ))}
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.mobileMenuSectionTitle}>{isJa ? 'ページ' : 'Pages'}</div>
                    <div className={styles.mobileMenuLinks} style={{ marginBottom: 14 }}>
                      {menuItems
                        .filter((it: any) => it.kind !== 'sep')
                        .map((it: any) => {
                          const active = isActiveHref(it.href)
                          const itemColor = getMenuTextColor(it.href)
                          const activeTheme = active && itemColor ? itemColor : null
                          return (
                            <Dialog.Close asChild key={it.href}>
                              <Link
                                href={withGentle(it.href)}
                                className={`${styles.mobileMenuLink} ${active ? styles.mobileMenuLinkActive : ''}`}
                                style={
                                  activeTheme
                                    ? { background: activeTheme, borderColor: activeTheme, color: '#fff' }
                                    : !active && itemColor
                                      ? { color: itemColor }
                                      : undefined
                                }
                                aria-current={active ? 'page' : undefined}
                              >
                                {it.label}
                              </Link>
                            </Dialog.Close>
                          )
                        })}
                    </div>

                    <div className={styles.divider} />
                    <div className={styles.mobileMenuSectionTitle}>{isJa ? '地域と言語' : 'Region & Language'}</div>
                    <div className={styles.mobileMenuLinks}>
                      {regionItems.map((x) => (
                        <Dialog.Close asChild key={x.code}>
                          <Link
                            href={x.href}
                            className={styles.mobileMenuLink}
                            aria-current={x.active ? 'page' : undefined}
                          >
                            {x.label}
                          </Link>
                        </Dialog.Close>
                      ))}
                    </div>

                    <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)' }}>
                      {isJa ? 'Escキーでも閉じられます' : 'Press Esc to close'}
                    </div>
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* ロゴ（画面中央） */}
        <div style={{ justifySelf: 'center' }}>
          <Link
            href={withGentle(country ? `/${country}` : '/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: 'inherit',
            }}
            aria-label="The Gentle Light"
            title="The Gentle Light"
          >
            <span className={styles.logoGlow}>
              <img
                src={logoSrc}
                alt="The Gentle Light"
                className={styles.logoImg}
              />
            </span>
          </Link>
        </div>

        <nav
          className={styles.desktopOnly}
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            alignItems: 'center',
            color: 'var(--text)',
            justifySelf: 'end',
          }}
        >
          {country ? (
            <>
              <RegionLangSwitch currentCountry={country} />
              <UserStatus country={country} />
            </>
          ) : (
            COUNTRIES.map((c) => (
              <Link
                key={c.code}
                href={withGentle(`/${c.code}`)}
                style={{
                  fontSize: 14,
                  color: 'var(--muted)',
                }}
              >
                {c.label}
              </Link>
            ))
          )}
        </nav>
      </div>

      {/* 下部メニュー（国別） */}
      {country ? (
        <div
          className={`relative ${styles.desktopOnly}`}
          style={{
            borderTop: '1px solid rgba(0,0,0,0.6)',
            borderBottom: '1px solid rgba(0,0,0,0.85)',
            background: '#fff',
            overflowX: 'auto',
            overflowY: 'hidden',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          <div style={{ maxWidth: '100%', margin: 0, padding: '5px 20px', display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                flexWrap: 'nowrap',
                width: 'max-content',
                whiteSpace: 'nowrap',
              }}
            >
              {menuItems.map((it, idx) => {
                if ((it as any).kind === 'sep') {
                  return null
                }
                const x = it as any
                const active = isActiveHref(x.href)
                const itemColor = getMenuTextColor(x.href)
                return (
                  <Link
                    key={x.href}
                    href={withGentle(x.href)}
                    style={{
                      fontSize: 14,
                      color: active ? '#fff' : itemColor || 'var(--text)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      border: `1px solid ${active ? (itemColor || '#000') : 'transparent'}`,
                      background: active ? (itemColor || '#000') : 'transparent',
                      fontWeight: active ? 700 : 400,
                    }}
                    aria-current={active ? 'page' : undefined}
                  >
                    {x.label}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

