import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from './quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'

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
  const apiPath = `/v1/${country}/quotes?limit=30${q ? `&q=${encodeURIComponent(q)}` : ''}${theme ? `&theme=${encodeURIComponent(theme)}` : ''}`

  const [data, themesData] = await Promise.all([
    fetchJson<QuotesResponse>(apiPath, { next: { revalidate: CACHE_POLICY.stable } }),
    fetchJson<QuoteThemesResponse>(`/v1/${country}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }),
  ])

  const themes = (themesData.themes || []).filter((x) => (x.count || 0) > 0).slice(0, 24)
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
        <h1 style={{ fontSize: '1.4rem' }}>{t.pages.quotes.title}</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.pages.quotes.subtitle}</span>
      </div>

      <div style={{ height: 12 }} />

      {/* テーマ棚（絞り込みリンク） */}
      {themes.length ? (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700 }}>{t.pages.quotes.themeShelf}</div>
            <div className={styles.shelfHint}>{t.pages.quotes.filterByTheme}</div>
          </div>
          <div style={{ height: 8 }} />
          <div className={styles.tagsRow}>
            <Link
              href={`/${country}/quotes`}
              className={styles.tagPill}
              aria-current={!theme ? 'page' : undefined}
              title={lang === 'ja' ? '絞り込みを解除' : 'Clear filter'}
              style={
                !theme
                  ? {
                      borderColor: 'rgba(0,0,0,0.35)',
                      background: 'rgba(0,0,0,0.03)',
                      fontWeight: 700,
                    }
                  : undefined
              }
            >
              {lang === 'ja' ? 'すべて' : 'All'}
            </Link>
            {themes.map((th) => (
              <Link
                key={th.theme}
                href={`/${country}/quotes?theme=${encodeURIComponent(th.theme)}`}
                className={styles.tagPill}
                aria-current={theme === th.theme ? 'page' : undefined}
                title={
                  lang === 'ja'
                    ? `テーマ「${th.theme_name || th.theme}」で絞り込み`
                    : `Filter by theme: ${th.theme_name || th.theme}`
                }
                style={
                  theme === th.theme
                    ? {
                        borderColor: 'rgba(0,0,0,0.35)',
                        background: 'rgba(0,0,0,0.03)',
                        fontWeight: 700,
                      }
                    : undefined
                }
              >
                {th.theme_name || th.theme}
              </Link>
            ))}
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
                <div className={styles.metaRow}>
                  {q.author_name ? <span>{q.author_name}</span> : null}
                  {q.source_text ? <span>{q.author_name ? ' / ' : ''}{q.source_text}</span> : null}
                </div>
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
                      href={`/${country}/quotes?theme=${encodeURIComponent(themeKey)}`}
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


