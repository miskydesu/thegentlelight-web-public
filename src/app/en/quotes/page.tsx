import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import styles from '../../[country]/quotes/quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { getCountryPreferenceHint } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

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

export function generateMetadata({ searchParams }: { searchParams: { q?: string; theme?: string; cursor?: string } }) {
  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const theme = typeof searchParams.theme === 'string' ? searchParams.theme.trim() : ''
  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0

  // q は無限に増えるため noindex（follow は維持）
  if (q) {
    return {
      title: `Search Results: ${q}`,
      robots: { index: false, follow: true, googleBot: { index: false, follow: true } },
      alternates: { canonical: canonicalUrl('/en/quotes') },
    }
  }

  // theme は固定語彙（themeページへ）
  if (theme) {
    return {
      title: `${theme} Quotes`,
      alternates: { canonical: canonicalUrl(`/en/quotes/theme/${encodeURIComponent(theme)}`) },
    }
  }

  const meta: any = {
    title: 'Calming Quotes & Inspiration',
    description:
      'Famous words and quotes, curated with a gentle lens—focused on learning and calm (mainly quotations and summaries).',
    keywords: ['calming quotes', 'inspirational quotes', 'peaceful words', 'mental wellness', 'mindfulness'],
    alternates: { canonical: canonicalUrl('/en/quotes') },
  }
  if (cursor > 0) {
    meta.robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
  }
  return meta
}

export default async function EnQuotesPage({ searchParams }: { searchParams: { q?: string; theme?: string; cursor?: string } }) {
  const pref = getCountryPreferenceHint()
  const preferred = pref.country
  const sourceCountry = 'ca'

  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const theme = typeof searchParams.theme === 'string' ? searchParams.theme.trim() : ''
  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const limit = 20

  // 互換: ?theme= はURL化した theme ページへ寄せる
  if (theme) {
    const sp = new URLSearchParams()
    if (q) sp.set('q', q)
    const qs = sp.toString()
    redirect(`/en/quotes/theme/${encodeURIComponent(theme)}${qs ? `?${qs}` : ''}`)
  }

  const apiPath = `/v1/${sourceCountry}/quotes?limit=${limit}&cursor=${cursor}${q ? `&q=${encodeURIComponent(q)}` : ''}`
  const [data, themesData] = await Promise.all([
    fetchJson<QuotesResponse>(apiPath, { next: { revalidate: CACHE_POLICY.stable } }).catch(() => null),
    fetchJson<QuoteThemesResponse>(`/v1/${sourceCountry}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }).catch(() => null),
  ])
  if (!data || !themesData) return notFound()

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
    return `/en/quotes${qs ? `?${qs}` : ''}`
  }

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>Inspirational Quotes</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>calm words</span>
      </div>

      <div style={{ height: 12 }} />

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="quotes"
        inferredCountry={pref.source === 'geo' ? preferred : null}
        inferredSource={pref.source}
      />

      {/* テーマ棚（絞り込みリンク） */}
      {themes.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>Themes</div>
            <div className={styles.shelfActions}>
              <Link href={`/en/quotes/authors`} className={styles.shelfLink}>
                Browse by Author
              </Link>
              <div className={styles.shelfHint}>Tap to filter</div>
            </div>
          </div>

          <div className={styles.themeShelfGrid}>
            <Link
              href={`/en/quotes`}
              className={`${styles.themeItem} ${!theme ? styles.themeItemActive : ''}`}
              aria-current={!theme ? 'page' : undefined}
              title="Clear filter"
            >
              <span className={styles.themeLabel}>All</span>
            </Link>

            {themes.map((th) => {
              const label = (th.theme_name || th.theme) as string
              const active = theme === th.theme
              return (
                <Link
                  key={th.theme}
                  href={`/en/quotes/theme/${encodeURIComponent(th.theme)}`}
                  className={`${styles.themeItem} ${active ? styles.themeItemActive : ''}`}
                  aria-current={active ? 'page' : undefined}
                  title={`Filter by theme: ${label}`}
                >
                  <span className={styles.themeLabel}>{label}</span>
                  <span className={styles.themeCount}>{th.count}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ) : null}

      <form method="GET" action={`/en/quotes`} style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Search quotes"
            style={{
              flex: '1 1 220px',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '10px 12px',
              fontSize: '0.95rem',
            }}
          />
          <button type="submit" className="tglButton">
            Search
          </button>
          {q ? (
            <Link href={`/en/quotes`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {data.quotes.length > 0 ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {start && end ? `Showing: ${start}-${end}` : null}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{`${limit} per page`}</span>
          </div>

          <div className={styles.listGrid}>
            {data.quotes.map((qq) => (
            <Card key={qq.quote_id} className={styles.topCard}>
              <Link href={`/en/quotes/${qq.quote_id}`} className={styles.mainLink}>
                <CardTitle className={styles.quoteTitle}>{qq.quote_text || '—'}</CardTitle>
                {(qq.author_name || qq.source_text) ? (
                  <div className={styles.metaRow}>
                    {qq.author_name ? <span className={styles.quoteAuthor}>{qq.author_name}</span> : null}
                    {qq.source_text ? <span className={styles.quoteSource}>{qq.source_text}</span> : null}
                  </div>
                ) : null}
              </Link>

              {qq.tags?.length
                ? (() => {
                    const themeTag = qq.tags.find((x) => typeof x === 'string' && x.startsWith('theme:')) || ''
                    const themeKey = themeTag ? themeTag.slice('theme:'.length) : ''
                    if (!themeKey) return null
                    const label = themeNameByTheme.get(themeKey) || themeKey
                    return (
                      <div className={styles.tagsRow}>
                        <Link
                          key={themeKey}
                          href={`/en/quotes/theme/${encodeURIComponent(themeKey)}`}
                          className={styles.tagPill}
                          title={`Filter by theme: ${label}`}
                        >
                          {label}
                        </Link>
                      </div>
                    )
                  })()
                : null}
            </Card>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{start && end ? `Showing: ${start}-${end}` : null}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  Back
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  Back
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(nextCursor)}>
                  Read a little more
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  Read a little more
                </span>
              )}
            </div>
          </div>

          {!hasNext ? (
            <div style={{ marginTop: 18, padding: '12px 12px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.03)', color: 'var(--text)', lineHeight: 1.6 }}>
              This is enough for today.
              <br />
              Come back when you need a gentle moment.
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={q || theme ? 'No results' : 'No quotes yet'}
          description={q || theme ? 'Try a different keyword.' : 'No quotes available yet.'}
          action={{ label: 'Back to home', href: `/${preferred}` }}
        />
      )}
    </main>
  )
}

