import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
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

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string; theme: string }
  searchParams?: { q?: string; cursor?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const theme = String(params.theme || '').trim()
  if (!theme) return {}
  const q = typeof searchParams?.q === 'string' ? searchParams.q.trim() : ''
  const cursor = Number.isFinite(Number(searchParams?.cursor)) ? Math.max(0, Math.trunc(Number(searchParams?.cursor))) : 0

  // theme は固定語彙として index を狙う前提（実体は API themes から出る想定）
  const canonical = canonicalUrl(`/${country}/quotes/theme/${encodeURIComponent(theme)}`)
  const hreflang = generateHreflang(`/quotes/theme/${theme}`)

  // Semrush等の「メタディスクリプション重複」を避けるため、
  // テーマごとにユニークな description を付与する。
  // - 可能なら themes API の theme_name（表示名）を使う
  const themeLabel = await (async () => {
    try {
      const themesData = await fetchJson<QuoteThemesResponse>(`/v1/${country}/quotes/themes`, {
        next: { revalidate: CACHE_POLICY.stable },
      })
      const hit = (themesData.themes || []).find((x) => String(x.theme || '').trim() === theme)
      return String(hit?.theme_name || hit?.theme || theme).trim() || theme
    } catch {
      return theme
    }
  })()
  const description = isJa
    ? `テーマ「${themeLabel}」の名言を一覧で。心を落ち着かせる言葉を集めました。`
    : `Quotes about ${themeLabel}. Calming words to help you reflect.`

  const meta: any = {
    title: isJa ? `${theme}の名言` : `${theme} Quotes`,
    description,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
  // 検索/ページングは noindex（重複・無限URLを避ける）
  if (q || cursor > 0) {
    meta.robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
    // canonical は常に「フィルタ無し・先頭ページ」に寄せる
    meta.alternates = { canonical }
  }
  return meta
}

export default async function QuotesThemePage({
  params,
  searchParams,
}: {
  params: { country: string; theme: string }
  searchParams: { q?: string; cursor?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const theme = String(params.theme || '').trim()
  if (!theme) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)

  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const limit = 20
  const apiPath = `/v1/${country}/quotes?limit=${limit}&cursor=${cursor}${q ? `&q=${encodeURIComponent(q)}` : ''}&theme=${encodeURIComponent(theme)}`

  const [data, themesData] = await Promise.all([
    fetchJson<QuotesResponse>(apiPath, { next: { revalidate: CACHE_POLICY.stable } }),
    fetchJson<QuoteThemesResponse>(`/v1/${country}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }),
  ])

  // themes が空の場合、themeページを成立させない（URL乱立/ゴミインデックス防止）
  const themeSet = new Set((themesData.themes || []).map((x) => String(x.theme || '').trim()).filter(Boolean))
  if (!themeSet.has(theme)) {
    // 互換: 古いURLや誤入力は一覧へ
    redirect(`/${country}/quotes`)
  }

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
  const themeLabel = themeNameByTheme.get(theme) || theme

  const hasPrev = cursor > 0
  const nextCursorFromMeta = Number.isFinite(Number(data.meta?.next_cursor)) ? Number(data.meta?.next_cursor) : null
  const hasNext = typeof nextCursorFromMeta === 'number' ? nextCursorFromMeta > cursor : data.quotes.length === limit
  const nextCursor = typeof nextCursorFromMeta === 'number' ? nextCursorFromMeta : cursor + data.quotes.length
  const start = data.quotes.length > 0 ? cursor + 1 : 0
  const end = cursor + data.quotes.length
  const buildUrl = (nextC: number) => {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    if (nextC > 0) sp.set('cursor', String(nextC))
    const qs = sp.toString()
    return `/${country}/quotes/theme/${encodeURIComponent(theme)}${qs ? `?${qs}` : ''}`
  }

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>
          {country === 'jp' ? '名言・癒しの言葉' : 'Inspirational Quotes'}
        </h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.pages.quotes.subtitle}</span>
      </div>

      <div style={{ height: 12 }} />

      {/* テーマ棚（絞り込みリンク） */}
      {themes.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>{t.pages.quotes.themeShelf}</div>
            <div className={styles.shelfHint}>{t.pages.quotes.filterByTheme}</div>
          </div>

          <div className={styles.themeShelfGrid}>
            <Link
              href={`/${country}/quotes`}
              className={styles.themeItem}
              aria-current={false}
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

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
          {lang === 'ja' ? `テーマ: ${themeLabel}` : `Theme: ${themeLabel}`}
        </div>
      </div>

      <form method="GET" action={`/${country}/quotes/theme/${encodeURIComponent(theme)}`} style={{ marginBottom: 14 }}>
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
              href={`/${country}/quotes/theme/${encodeURIComponent(theme)}`}
              style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
            >
              {t.pages.quotes.clear}
            </Link>
          ) : null}
        </div>
      </form>

      {data.quotes.length > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {start && end ? (lang === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{lang === 'ja' ? `1ページ ${limit}件` : `${limit} per page`}</span>
          </div>

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
            </Card>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {start && end ? (lang === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {lang === 'ja' ? '戻る' : 'Back'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {lang === 'ja' ? '戻る' : 'Back'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(nextCursor)}>
                  {lang === 'ja' ? 'もう少し読む' : 'Read a little more'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {lang === 'ja' ? 'もう少し読む' : 'Read a little more'}
                </span>
              )}
            </div>
          </div>

          {!hasNext ? (
            <div style={{ marginTop: 18, padding: '12px 12px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.03)', color: 'var(--text)', lineHeight: 1.6 }}>
              {lang === 'ja' ? (
                <>
                  今日は、これくらいでも十分です。
                  <br />
                  また、必要なときに。
                </>
              ) : (
                <>
                  This is enough for today.
                  <br />
                  Come back when you need a gentle moment.
                </>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={q ? t.pages.quotes.noResults : t.pages.quotes.empty}
          description={q ? t.pages.quotes.noResultsDescription : t.pages.quotes.emptyDescription}
          action={{ label: t.nav.top, href: `/${country}` }}
        />
      )}
    </main>
  )
}


