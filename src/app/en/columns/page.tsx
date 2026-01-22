import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent } from '@/components/ui/Card'
import { WriterLink } from '@/components/columns/WriterLink'
import styles from '@/app/[country]/columns/columns.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { getCountryPreferenceHint } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

function joinUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/, '')
  const k = key.replace(/^\/+/, '')
  return `${b}/${k}`
}

type ColumnsResponse = {
  columns: Array<{
    column_id: string
    title: string | null
    slug: string | null
    excerpt: string | null
    tags: string[]
    cover_image_key: string | null
    writer_name?: string | null
    writers?: Array<{ writer_id: string; writer_name_en: string | null; writer_name_jp: string | null }>
    column_name?: {
      column_name_id: string
      slug: string
      name: string
      description: string | null
      display_order: number | null
    } | null
    published_at: string | null
    updated_at: string | null
  }>
  meta: ApiMeta
}

export function generateMetadata() {
  const baseDescription =
    'Thoughtful columns on news, mental health, and how to stay informed without anxiety or doomscrolling.'
  return {
    title: 'Thoughtful Columns',
    description: `Columns to build a calmer relationship with the news. ${baseDescription}`,
    keywords: ['news columns', 'mental health news', 'how to stay informed', 'news without anxiety', 'healthy news consumption'],
    alternates: {
      canonical: canonicalUrl('/en/columns'),
    },
  }
}

export default async function EnColumnsPage() {
  // Content source: English editions are identical, so we read from CA.
  const sourceCountry = 'ca'
  const pref = getCountryPreferenceHint()
  const preferred = pref.country
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnsResponse>(`/v1/${sourceCountry}/columns?limit=30`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()

  const groups = (() => {
    const map = new Map<
      string,
      {
        key: string
        title: string
        description: string | null
        display_order: number | null
        slug: string | null
        columns: ColumnsResponse['columns']
      }
    >()
    const uncategorizedKey = '__uncategorized__'
    const uncategorizedTitle = 'Other'

    for (const c of data.columns) {
      const cn = c.column_name || null
      const key = cn?.column_name_id || uncategorizedKey
      const title = cn?.name || uncategorizedTitle
      const description = cn?.description ?? null
      const display_order = cn?.display_order ?? null
      if (!map.has(key)) {
        map.set(key, { key, title, description, display_order, slug: cn?.slug ?? null, columns: [] })
      }
      map.get(key)!.columns.push(c)
    }

    const arr = Array.from(map.values())
    arr.sort((a, b) => {
      const ao = a.display_order
      const bo = b.display_order
      if (ao === null && bo !== null) return 1
      if (ao !== null && bo === null) return -1
      if (ao !== null && bo !== null && ao !== bo) return ao - bo
      return a.title.localeCompare(b.title)
    })
    for (const g of arr) {
      g.columns.sort((x, y) => {
        const ax = x.published_at || x.updated_at || ''
        const ay = y.published_at || y.updated_at || ''
        return ay.localeCompare(ax)
      })
    }
    return arr
  })()

  const getDateValue = (c: ColumnsResponse['columns'][number]) => c.published_at || c.updated_at || ''
  const featured = [...data.columns].sort((a, b) => getDateValue(b).localeCompare(getDateValue(a)))[0] || null
  const featuredId = featured?.column_id || null
  const visibleGroups = groups
    .map((g) => ({ ...g, columns: g.columns.filter((c) => c.column_id !== featuredId) }))
    .filter((g) => g.columns.length > 0)

  const renderWriters = (writers?: ColumnsResponse['columns'][number]['writers'], fallback?: string | null) => {
    if (writers?.length) {
      return writers.map((w) => {
        const label = w.writer_name_en || w.writer_name_jp
        if (!label || !w.writer_id) return null
        return (
          <WriterLink key={w.writer_id} href={`/en/writers/${encodeURIComponent(w.writer_id)}`} className={styles.writerName}>
            {`By ${label}`}
          </WriterLink>
        )
      })
    }
    if (!fallback) return null
    return <span className={styles.writerName}>{`By ${fallback}`}</span>
  }

  return (
    <main>
      {/* Ensure sidebar CSS override is applied immediately (before hydration) */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.setAttribute('data-tgl-page','columns');",
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '1rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
          paddingBottom: 8,
          marginBottom: 2,
        }}
      >
        <h1 style={{ fontSize: '1.4rem' }}>Columns</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>published</span>
      </div>

      <div style={{ height: 12 }} />

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="columns"
        inferredCountry={pref.source === 'geo' ? preferred : null}
        inferredSource={pref.source}
      />

      {data.columns.length > 0 ? (
        <div className={styles.groupList}>
          {featured ? (
            <section className={styles.featuredSection}>
              <div className={styles.featuredHeader}>Latest column</div>
              <Link href={`/en/columns/${featured.column_id}`} style={{ textDecoration: 'none' }}>
                <Card clickable className={`${styles.topCard} ${styles.featuredCard}`}>
                  <div className={styles.featuredRow}>
                    {imageBase && featured.cover_image_key ? (
                      <img
                        className={styles.featuredThumb}
                        src={joinUrl(imageBase, featured.cover_image_key) + (featured.published_at ? `?v=${encodeURIComponent(featured.published_at)}` : '')}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <div className={styles.featuredThumb} />
                    )}
                    <div className={styles.featuredBody}>
                      <div className={styles.featuredLabel}>Latest</div>
                      <CardTitle className={styles.featuredTitle}>{featured.title || '(no title)'}</CardTitle>
                      {featured.excerpt ? (
                        <CardContent style={{ marginTop: '0.25rem' }}>
                          <p className={styles.featuredExcerpt}>{featured.excerpt}</p>
                        </CardContent>
                      ) : null}
                      <div className={styles.metaRow}>
                        <div className={styles.metaLeft}>
                          {renderWriters(featured.writers, featured.writer_name)}
                          {featured.tags?.length ? <span>{featured.tags.slice(0, 2).join(', ')}</span> : null}
                        </div>
                        {featured.published_at || featured.updated_at ? (
                          <span className={styles.metaDate}>{new Date(featured.published_at || featured.updated_at || '').toLocaleDateString()}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </section>
          ) : null}

          {visibleGroups.map((g) => (
            <section key={g.key} className={styles.groupSection}>
              <div className={styles.groupHeader}>
                {g.slug && g.key !== '__uncategorized__' ? (
                  <Link href={`/en/columns/series/${encodeURIComponent(g.slug)}`} className={styles.groupTitleLink}>
                    <h2 className={styles.groupTitle}>{g.title}</h2>
                  </Link>
                ) : (
                  <h2 className={styles.groupTitle}>{g.title}</h2>
                )}
                {g.description ? <div className={styles.groupDescription}>{g.description}</div> : null}
              </div>
              <div className={styles.listGrid}>
                {g.columns.map((c) => (
                  <Link key={c.column_id} href={`/en/columns/${c.column_id}`} style={{ textDecoration: 'none' }}>
                    <Card clickable className={styles.topCard}>
                      <div className={styles.row}>
                        {imageBase && c.cover_image_key ? (
                          <img
                            className={styles.thumb}
                            src={joinUrl(imageBase, c.cover_image_key) + (c.published_at ? `?v=${encodeURIComponent(c.published_at)}` : '')}
                            alt=""
                            loading="lazy"
                          />
                        ) : (
                          <div className={styles.thumb} />
                        )}

                        <div className={styles.textCol}>
                          <CardTitle>{c.title || '(no title)'}</CardTitle>
                          {c.excerpt ? (
                            <CardContent style={{ marginTop: '0.25rem' }}>
                              <p className={styles.excerpt}>{c.excerpt}</p>
                            </CardContent>
                          ) : null}

                          <div className={styles.metaRow}>
                            <div className={styles.metaLeft}>
                              {renderWriters(c.writers, c.writer_name)}
                              {c.tags?.length ? <span>{c.tags.slice(0, 2).join(', ')}</span> : null}
                            </div>
                            {c.published_at || c.updated_at ? (
                              <span className={styles.metaDate}>{new Date(c.published_at || c.updated_at || '').toLocaleDateString()}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No columns yet"
          description="No published columns yet."
          action={{ label: 'Back to home', href: `/${preferred}` }}
        />
      )}
    </main>
  )
}

