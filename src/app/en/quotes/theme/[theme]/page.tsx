import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import styles from '../../../[country]/quotes/quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'

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

export async function generateMetadata({ params }: { params: { theme: string } }) {
  const theme = String(params.theme || '').trim()
  if (!theme) return {}
  return {
    title: `${theme} Quotes`,
    alternates: {
      canonical: canonicalUrl(`/en/quotes/theme/${encodeURIComponent(theme)}`),
    },
  }
}

export default async function EnQuotesThemePage({
  params,
  searchParams,
}: {
  params: { theme: string }
  searchParams: { q?: string }
}) {
  const sourceCountry = 'ca'
  const theme = String(params.theme || '').trim()
  if (!theme) return notFound()

  const q = typeof searchParams.q === 'string' ? searchParams.q.trim() : ''
  const apiPath = `/v1/${sourceCountry}/quotes?limit=30${q ? `&q=${encodeURIComponent(q)}` : ''}&theme=${encodeURIComponent(theme)}`

  const [data, themesData] = await Promise.all([
    fetchJson<QuotesResponse>(apiPath, { next: { revalidate: CACHE_POLICY.stable } }).catch(() => null),
    fetchJson<QuoteThemesResponse>(`/v1/${sourceCountry}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }).catch(() => null),
  ])
  if (!data || !themesData) return notFound()

  // themes が空の場合、themeページを成立させない（URL乱立/ゴミインデックス防止）
  const themeSet = new Set((themesData.themes || []).map((x) => String(x.theme || '').trim()).filter(Boolean))
  if (!themeSet.has(theme)) {
    redirect(`/en/quotes`)
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

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>Inspirational Quotes</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>calm words</span>
      </div>

      <div style={{ height: 12 }} />

      {/* テーマ棚（絞り込みリンク） */}
      {themes.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>Themes</div>
            <div className={styles.shelfHint}>Tap to filter</div>
          </div>

          <div className={styles.themeShelfGrid}>
            <Link href={`/en/quotes`} className={styles.themeItem} aria-current={false} title="Clear filter">
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

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>{`Theme: ${themeLabel}`}</div>
      </div>

      <form method="GET" action={`/en/quotes/theme/${encodeURIComponent(theme)}`} style={{ marginBottom: 14 }}>
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
            <Link href={`/en/quotes/theme/${encodeURIComponent(theme)}`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {data.quotes.length > 0 ? (
        <div className={styles.listGrid}>
          {data.quotes.map((qq) => (
            <Card key={qq.quote_id} className={styles.topCard}>
              <Link href={`/en/quotes/${qq.quote_id}`} className={styles.mainLink}>
                <CardTitle className={styles.quoteTitle}>{qq.quote_text || '—'}</CardTitle>
                <div className={styles.metaRow}>
                  {qq.author_name ? <span>{qq.author_name}</span> : null}
                  {qq.source_text ? <span>{qq.author_name ? ' / ' : ''}{qq.source_text}</span> : null}
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title={q ? 'No results' : 'No quotes yet'}
          description={q ? 'Try a different keyword.' : 'No quotes available yet.'}
          action={{ label: 'Back to Quotes', href: `/en/quotes` }}
        />
      )}
    </main>
  )
}

