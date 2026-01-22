import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from './quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl, getCountrySeoMeta } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'

type QuotesResponse = {
  quotes: Array<{
    quote_id: string
    author_name: string | null
    source_text: string | null
    quote_text: string | null
    note: string | null
    tags: string[]
    created_at: string | null
    updated_at: string | null
  }>
  meta: ApiMeta
}

type QuoteThemesResponse = {
  themes: Array<{
    theme: string
    theme_tag: string
    theme_name: string | null
    count: number
    display_order: number | null
  }>
  meta: ApiMeta
}

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; theme?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const { descriptionSuffixEn, descriptionSuffixJa } = getCountrySeoMeta(country)
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const theme = typeof searchParams.theme === 'string' ? searchParams.theme.trim() : ''

  const hreflang = (q || theme) ? null : generateHreflang('/quotes')
  const canonical = canonicalUrl(`/${country}/quotes${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`)

  // q は無限に増えるため noindex（follow は維持）
  if (q) {
    return {
      title: isJa ? `検索結果：${q}` : `Search Results: ${q}`,
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
      alternates: { canonical: canonicalUrl(`/${country}/quotes`) },
    }
  }

  // theme は固定語彙なら index も検討可（現状は canonical をクエリ込みにする）
  if (theme) {
    return {
      title: isJa ? `${theme}の名言` : `${theme} Quotes`,
      alternates: { canonical: canonicalUrl(`/${country}/quotes/theme/${encodeURIComponent(theme)}`) },
    }
  }

  return {
    title: isJa ? '偉人の言葉を、やさしい視点で｜学びと癒やしの名言' : 'Calming Quotes & Inspiration',
    description: isJa
      ? `偉人の言葉に、やさしい視点を添えて。学びと癒やしを大切に、心がほどける言葉を集めました（引用・要約を中心に再編集しています）。${descriptionSuffixJa}`
      : `Famous words and quotes, curated with a gentle lens—focused on learning and calm (mainly quotations and summaries).${descriptionSuffixEn}`,
    keywords: isJa
      ? [
          '偉人の言葉',
          '名言',
          '心に響く言葉',
          '学び',
          '癒やし',
          'やさしい言葉',
          '前向きになれる言葉',
          '穏やかな言葉',
          'メンタルウェルネス',
          'マインドフルネス',
        ]
      : ['calming quotes', 'inspirational quotes', 'peaceful words', 'mental wellness', 'mindfulness'],
    alternates: {
      canonical: canonicalUrl(`/${country}/quotes`),
      ...(hreflang ? { languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])) } : {}),
    },
  }
}

export default async function QuotesPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; theme?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)

  // searchParamsは任意（シンプルなGET検索フォーム）
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const theme = typeof searchParams.theme === 'string' ? searchParams.theme.trim() : ''

  // 互換: ?theme= はURL化した theme ページへ寄せる
  if (theme) {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    const qs = sp.toString()
    redirect(`/${country}/quotes/theme/${encodeURIComponent(theme)}${qs ? `?${qs}` : ''}`)
  }

  const apiPath = `/v1/${country}/quotes?limit=30${q ? `&q=${encodeURIComponent(q)}` : ''}${theme ? `&theme=${encodeURIComponent(theme)}` : ''}`

  const [data, themesData] = await Promise.all([
    fetchJson<QuotesResponse>(apiPath, { next: { revalidate: CACHE_POLICY.stable } }),
    fetchJson<QuoteThemesResponse>(`/v1/${country}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }),
  ])

  const themes = (themesData.themes || [])
    .filter((x) => (x.count || 0) > 0)
    .sort((a, b) => {
      const ao = a.display_order ?? 9999
      const bo = b.display_order ?? 9999
      if (ao !== bo) return ao - bo
      return (b.count || 0) - (a.count || 0)
    })
    .slice(0, 9)
  const themeNameByTheme = new Map<string, string>()
  for (const th of themesData.themes || []) {
    const key = String(th.theme || '').trim()
    if (!key) continue
    const name = String(th.theme_name || '').trim()
    if (name) themeNameByTheme.set(key, name)
  }

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? '名言・癒しの言葉' : 'Inspirational Quotes'}</h1>
        {lang === 'ja' ? (
          <div className={styles.quoteSubcopy}>
            心に残った名言を、少しずつ集めています。
            <br />
            落ち着きたいときに、そっと開ける場所に。
          </div>
        ) : (
          <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.pages.quotes.subtitle}</span>
        )}
      </div>

      <div style={{ height: 12 }} />

      {/* テーマ棚（絞り込みリンク） */}
      {themes.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>{t.pages.quotes.themeShelf}</div>
            <div className={styles.shelfActions}>
              <Link href={`/${country}/quotes/authors`} className={styles.shelfLink}>
                {lang === 'ja' ? '著者で選ぶ' : 'Browse by Author'}
              </Link>
              <div className={styles.shelfHint}>{t.pages.quotes.filterByTheme}</div>
            </div>
          </div>

          <div className={styles.themeShelfGrid}>
            <Link
              href={`/${country}/quotes`}
              className={`${styles.themeItem} ${!theme ? styles.themeItemActive : ''}`}
              aria-current={!theme ? 'page' : undefined}
              title={lang === 'ja' ? '絞り込みを解除' : 'Clear filter'}
            >
              <span className={styles.themeLabel}>{lang === 'ja' ? 'すべて' : 'All'}</span>
            </Link>

            {themes.map((th) => {
              const label = (th.theme_name || th.theme) as string
              const active = theme === th.theme
              return (
                <Link
                  key={th.theme}
                  href={`/${country}/quotes/theme/${encodeURIComponent(th.theme)}`}
                  className={`${styles.themeItem} ${active ? styles.themeItemActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={
                    lang === 'ja'
                      ? `テーマ「${label}」で絞り込み`
                      : `Filter by theme: ${label}`
                  }
                >
                  <span className={styles.themeLabel}>{label}</span>
                  <span className={styles.themeCount}>{th.count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      <form method="GET" action={`/${country}/quotes`} style={{ marginBottom: 14 }}>
        {theme ? <input type="hidden" name="theme" value={theme} /> : null}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder={t.pages.quotes.searchPlaceholder}
            style={{
              flex: '1 1 220px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: '0.95rem',
            }}
          />
          <button type="submit" className="tglButton">
            {t.common.search}
          </button>
          {q ? (
            <Link
              href={`/${country}/quotes${theme ? `?theme=${encodeURIComponent(theme)}` : ''}`}
              style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
            >
              {t.pages.quotes.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {data.quotes.length > 0 ? (
        <div className={styles.listGrid}>
          {data.quotes.map((q) => (
            <Card key={q.quote_id} className={styles.topCard}>
              <Link href={`/${country}/quotes/${q.quote_id}`} className={styles.mainLink}>
                <CardTitle className={styles.quoteTitle}>{q.quote_text || '—'}</CardTitle>
                {(q.author_name || q.source_text) ? (
                  <div className={styles.metaRow}>
                    {q.author_name ? <span className={styles.quoteAuthor}>{q.author_name}</span> : null}
                    {q.source_text ? <span className={styles.quoteSource}>{q.source_text}</span> : null}
                  </div>
                ) : null}
              </Link>

              {q.tags?.length ? (() => {
                const themeTag = q.tags.find((x) => typeof x === 'string' && x.startsWith('theme:')) || ''
                const themeKey = themeTag ? themeTag.slice('theme:'.length) : ''
                if (!themeKey) return null
                const label = themeNameByTheme.get(themeKey) || themeKey
                return (
                <div className={styles.tagsRow}>
                    <Link
                      key={themeKey}
                      href={`/${country}/quotes/theme/${encodeURIComponent(themeKey)}`}
                      className={styles.tagPill}
                      title={lang === 'ja' ? `テーマ「${label}」で絞り込み` : `Filter by theme: ${label}`}
                    >
                      {label}
                    </Link>
                </div>
                )
              })() : null}
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q || theme ? t.pages.quotes.noResults : t.pages.quotes.empty}
          description={
            q || theme ? t.pages.quotes.noResultsDescription : t.pages.quotes.emptyDescription
          }
          action={{ label: t.nav.top, href: `/${country}` }}
        />
      )}
    </main>
  )
}


