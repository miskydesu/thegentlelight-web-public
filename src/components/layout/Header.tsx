'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { COUNTRIES, isCountry, type Country } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CATEGORIES, getCategoryLabel } from '@/lib/categories'
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
  const safePathname = pathname || ''
  const [isHiddenOnScroll, setIsHiddenOnScroll] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(false)
  const [headerHeight, setHeaderHeight] = useState(0)
  const lastScrollYRef = useRef(0)
  const tickingRef = useRef(false)
  const headerRef = useRef<HTMLElement | null>(null)
  const hiddenRef = useRef(false)

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
    const qs = searchParams?.toString() || ''
    const currentUrl = `${safePathname}${qs ? `?${qs}` : ''}`
    const hasGentleParam = searchParams?.get('gentle') != null
    if (hasGentleParam) return

    const preferred = getPreferredGentle()
    if (preferred !== true) return

    const nextUrl = addGentleToUrl(currentUrl, true)
    if (nextUrl !== currentUrl) {
      // server components を確実に切り替えるため full reload
      window.location.replace(nextUrl)
    }
  }, [pathname, searchParams])

  // Mobile header hide-on-scroll (down) / show-on-scroll (up)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(max-width: 767px)')
    const syncViewport = () => {
      const isMobile = mq.matches
      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsHiddenOnScroll(false)
        hiddenRef.current = false
      }
    }
    syncViewport()

    const updateHeaderHeight = () => {
      const h = headerRef.current?.getBoundingClientRect().height || 0
      if (Number.isFinite(h) && h > 0) {
        setHeaderHeight(h)
      }
    }

    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      window.requestAnimationFrame(() => {
        const y = window.scrollY || 0
        const prev = lastScrollYRef.current
        const delta = y - prev
        const threshold = headerHeight > 0 ? headerHeight * 0.5 : 30
        const nearTop = y <= threshold
        if (nearTop) {
          hiddenRef.current = false
          setIsHiddenOnScroll(false)
        } else if (delta > 6) {
          hiddenRef.current = true
          setIsHiddenOnScroll(true)
        } else if (delta < (hiddenRef.current ? -1 : -6)) {
          hiddenRef.current = false
          setIsHiddenOnScroll(false)
        }
        lastScrollYRef.current = y
        tickingRef.current = false
      })
    }

    lastScrollYRef.current = window.scrollY || 0
    updateHeaderHeight()
    const rafId = window.requestAnimationFrame(updateHeaderHeight)
    const timeoutId = window.setTimeout(updateHeaderHeight, 120)
    const ro = window.ResizeObserver ? new ResizeObserver(updateHeaderHeight) : null
    if (ro && headerRef.current) ro.observe(headerRef.current)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', updateHeaderHeight)
    if (mq.addEventListener) {
      mq.addEventListener('change', syncViewport)
    } else {
      // Safari fallback
      mq.addListener(syncViewport)
    }
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', updateHeaderHeight)
      window.cancelAnimationFrame(rafId)
      window.clearTimeout(timeoutId)
      if (ro) ro.disconnect()
      if (mq.removeEventListener) {
        mq.removeEventListener('change', syncViewport)
      } else {
        mq.removeListener(syncViewport)
      }
    }
  }, [])

  // Route marker for CSS-based sidebar overrides (server-side pathname is not always reliable in dev/edge)
  useEffect(() => {
    const isColumns = /\/columns(\/|$)/.test(safePathname)
    if (isColumns) {
      document.documentElement.setAttribute('data-tgl-page', 'columns')
    } else {
      document.documentElement.removeAttribute('data-tgl-page')
    }
  }, [safePathname])

  const gentle = getGentleFromUrl(`${safePathname}?${searchParams?.toString() || ''}`)
  const withGentle = (url: string) => addGentleToUrl(url, gentle)

  // mobile menu: Region & Language items (Dialog内に直接表示したいので、RegionLangSwitchのロジックをここでも生成)
  const regionItems = useMemo(() => {
    if (!country) return []
    const gentleParam = searchParams?.get('gentle')
    const gentle2 = gentleParam === '1' || gentleParam === 'true'
    const categoryMatch = safePathname.match(/\/category\/([^/]+)/)
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
      const baseUrl = getCountrySwitchUrl(country, to, safePathname || `/${country}`, category, null)
      const href = addGentleToUrl(baseUrl, gentle2)
      return { code: to, label: isJa2 ? labelsJa[to] : labelsEn[to], href, active: to === country }
    })
  }, [country, safePathname, searchParams])

  const getMenuTextColor = (href: string): string | null => {
    if (!country) return null
    const clean = String(href || '').split('?')[0] || ''
    if (clean === `/${country}/category/heartwarming`) return '#c84b73' // heartwarming (subtle accent)
    if (clean === `/${country}/columns`) return '#d63384' // pink
    if (clean === `/${country}/quotes`) return '#1f8a5b' // green
    return null
  }

  const isActiveHref = (href: string): boolean => {
    const clean = String(href || '').split('?')[0] || ''
    if (!clean) return false
    // 国トップは prefix 判定にすると常に当たるので「完全一致」のみ
    if (country && clean === `/${country}`) return safePathname === clean
    return safePathname === clean || safePathname.startsWith(`${clean}/`)
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
    const labelDaily = t?.nav.daily ?? (isJa ? '日報' : 'Daily')
    return [
      { kind: 'link' as const, label: labelTop, href: `/${country}` },
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

  const mobilePrimaryItems = useMemo(() => {
    if (!country) return []
    const labelTop = t?.nav.top ?? (isJa ? 'トップ' : 'Home')
    const labelDailyToday = isJa ? '今日の朝刊' : "Today's Briefing"
    const labelNews = isJa ? 'ニュース' : 'News'
    const labelColumns = isJa ? 'コラム' : 'Columns'
    const labelQuotes = isJa ? '名言' : 'Quotes'
    const labelAbout = isJa ? 'サイトの説明' : 'About'
    const labelHeartwarming = getCategoryLabel('heartwarming', locale)
    return [
      { label: labelTop, href: `/${country}` },
      { label: labelDailyToday, href: `/${country}/daily/today` },
      { label: labelNews, href: `/${country}/news` },
      { label: labelHeartwarming, href: `/${country}/category/heartwarming` },
      { label: labelColumns, href: `/${country}/columns` },
      { label: labelQuotes, href: `/${country}/quotes` },
      { label: labelAbout, href: `/${country}/about` },
    ]
  }, [country, isJa, locale, t])

  // Desktop (>=1024想定): 下段ナビは「レベル1」だけに絞る（カテゴリは /news 側の棚に集約）
  const desktopNavItems = useMemo(() => {
    if (!country) return { left: [], right: null as any }
    const labelTop = t?.nav.top ?? (isJa ? 'トップ' : 'Home')
    const labelDailyToday = isJa ? '今日の朝刊' : "Today's Briefing"
    const labelNews = isJa ? 'ニュース' : 'News'
    const labelColumns = isJa ? 'コラム' : 'Columns'
    const labelQuotes = isJa ? '名言' : 'Quotes'
    const labelAbout = isJa ? 'サイトの説明' : 'About'
    const labelHeartwarming = getCategoryLabel('heartwarming', locale)

    const left = [
      { label: labelTop, href: `/${country}` },
      { label: labelDailyToday, href: `/${country}/daily/today` },
      { label: labelNews, href: `/${country}/news` },
      { label: labelHeartwarming, href: `/${country}/category/heartwarming` },
      { label: labelColumns, href: `/${country}/columns` },
      { label: labelQuotes, href: `/${country}/quotes` },
    ]
    const right = { label: labelAbout, href: `/${country}/about` }
    return { left, right }
  }, [country, isJa, locale, t])

  return (
    <>
      <header
        ref={headerRef}
        className={[
          className,
          styles.mobileHeader,
          isMobileViewport ? styles.mobileHeaderFixed : '',
          isHiddenOnScroll ? styles.mobileHeaderHidden : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={{
          position: isMobileViewport ? 'fixed' : 'sticky',
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
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
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
                      {mobilePrimaryItems.map((it) => {
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
                    <details
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: '#fff',
                        marginBottom: 14,
                      }}
                    >
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontWeight: 800,
                          listStyle: 'none',
                        }}
                      >
                        {isJa ? 'ニュースカテゴリ' : 'News categories'}
                      </summary>
                      <div style={{ height: 8 }} />
                      <div className={styles.mobileMenuLinks}>
                        {CATEGORIES.map((c) => {
                          const href = `/${country}/category/${c.code}`
                          return (
                            <Dialog.Close asChild key={c.code}>
                              <Link href={withGentle(href)} className={styles.mobileMenuLink}>
                                {getCategoryLabel(c.code, locale)}
                              </Link>
                            </Dialog.Close>
                          )
                        })}
                      </div>
                    </details>

                    <div className={styles.divider} />
                    <details
                      style={{
                        border: '1px solid var(--border)',
                        borderRadius: 10,
                        padding: '8px 10px',
                        background: '#fff',
                      }}
                    >
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontWeight: 800,
                          listStyle: 'none',
                        }}
                      >
                        {isJa ? '地域と言語' : 'Region & Language'}
                      </summary>
                      <div style={{ height: 8 }} />
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
                    </details>

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
        <div style={{ justifySelf: 'center', maxWidth: '100%', minWidth: 0 }}>
          <Link
            href={withGentle(country ? `/${country}` : '/')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: 'inherit',
              maxWidth: '100%',
            }}
            aria-label="The Gentle Light"
            title="The Gentle Light"
          >
            <span className={styles.logoGlow} style={{ maxWidth: '100%' }}>
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
          }}
        >
          <div style={{ maxWidth: '100%', margin: 0, padding: '6px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
                {desktopNavItems.left.map((x) => {
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
                        textDecoration: 'none',
                      }}
                      aria-current={active ? 'page' : undefined}
                    >
                      {x.label}
                    </Link>
                  )
                })}
              </div>

              {desktopNavItems.right ? (
                (() => {
                  const x = desktopNavItems.right
                  const active = isActiveHref(x.href)
                  return (
                    <Link
                      href={withGentle(x.href)}
                      style={{
                        fontSize: 14,
                        color: active ? '#fff' : 'var(--muted)',
                        borderRadius: 6,
                        padding: '4px 10px',
                        border: `1px solid ${active ? '#000' : 'transparent'}`,
                        background: active ? '#000' : 'transparent',
                        fontWeight: active ? 700 : 400,
                        textDecoration: 'none',
                      }}
                      aria-current={active ? 'page' : undefined}
                    >
                      {x.label}
                    </Link>
                  )
                })()
              ) : null}
            </div>
          </div>
        </div>
        ) : null}
      </header>
      {isMobileViewport ? <div className={styles.mobileHeaderSpacer} style={{ height: headerHeight }} /> : null}
    </>
  )
}

