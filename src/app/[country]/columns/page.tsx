import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { WriterLink } from '@/components/columns/WriterLink'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from './columns.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl, getCountrySeoMeta } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'

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

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const isJa = country === 'jp'
  const { descriptionSuffixEn, descriptionSuffixJa } = getCountrySeoMeta(country)
  const hreflang = generateHreflang('/columns')
  const baseDescription = isJa
    ? 'ニュースと付き合うためのコラム。不安にならない、煽られない、心が落ち着く“静かさ”の考察（メンタルヘルスにも配慮）。'
    : 'Thoughtful columns on news, mental health, and how to stay informed without anxiety or doomscrolling.'
  return {
    title: isJa ? 'ニュースと心の距離を、整えるコラム' : 'Thoughtful Columns',
    description: isJa
      ? `${baseDescription}${descriptionSuffixJa}`
      : `Columns to build a calmer relationship with the news. ${baseDescription}${descriptionSuffixEn}`,
    keywords: isJa
      ? [
          'ニュース疲れ',
          '情報過多',
          '不安にならない',
          '煽られない',
          '心が落ち着く',
          '静かなニュース',
          'ニュースコラム',
          '健康的なニュース消費',
          'メンタルヘルス',
        ]
      : ['news columns', 'mental health news', 'how to stay informed', 'news without anxiety', 'healthy news consumption'],
    alternates: {
      canonical: canonicalUrl(`/${country}/columns`),
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function ColumnsPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnsResponse>(`/v1/${country}/columns?limit=30`, {
    next: { revalidate: CACHE_POLICY.stable },
  })

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
    const uncategorizedTitle = lang === 'ja' ? 'その他' : 'Other'

    for (const c of data.columns) {
      const cn = c.column_name || null
      const key = cn?.column_name_id || uncategorizedKey
      const title = cn?.name || uncategorizedTitle
      const description = cn?.description ?? null
      const display_order = cn?.display_order ?? null
      if (!map.has(key)) {
        map.set(key, { key, title, description, display_order, slug: cn?.slug ?? null, columns: [] })
      }
      // descriptionは最初に来た値を採用（同じ棚内で揺れない想定）
      map.get(key)!.columns.push(c)
    }

    const arr = Array.from(map.values())
    // group order: display_order asc, then title
    arr.sort((a, b) => {
      const ao = a.display_order
      const bo = b.display_order
      if (ao === null && bo !== null) return 1
      if (ao !== null && bo === null) return -1
      if (ao !== null && bo !== null && ao !== bo) return ao - bo
      return a.title.localeCompare(b.title)
    })
    // inside group: newest first
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
        const label = (isJa ? w.writer_name_jp : w.writer_name_en) || w.writer_name_en || w.writer_name_jp
        if (!label || !w.writer_id) return null
        const text = isJa ? `ライター: ${label}` : `By ${label}`
        return (
          <WriterLink key={w.writer_id} href={`/${country}/writers/${encodeURIComponent(w.writer_id)}`} className={styles.writerName}>
            {text}
          </WriterLink>
        )
      })
    }
    if (!fallback) return null
    return <span className={styles.writerName}>{isJa ? `ライター: ${fallback}` : `By ${fallback}`}</span>
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
        <h1 style={{ fontSize: '1.4rem' }}>{lang === 'ja' ? 'コラム一覧' : 'Columns'}</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{lang === 'ja' ? '公開' : 'published'}</span>
      </div>

      <div style={{ height: 12 }} />

      {data.columns.length > 0 ? (
        <div className={styles.groupList}>
          {featured ? (
            <section className={styles.featuredSection}>
              <div className={styles.featuredHeader}>{lang === 'ja' ? '最新のコラム' : 'Latest column'}</div>
              <Link href={`/${country}/columns/${featured.column_id}`} style={{ textDecoration: 'none' }}>
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
                      <div className={styles.featuredLabel}>{lang === 'ja' ? 'Latest' : 'Latest'}</div>
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
                  <Link href={`/${country}/columns/series/${encodeURIComponent(g.slug)}`} className={styles.groupTitleLink}>
                    <h2 className={styles.groupTitle}>{g.title}</h2>
                  </Link>
                ) : (
                  <h2 className={styles.groupTitle}>{g.title}</h2>
                )}
                {g.description ? <div className={styles.groupDescription}>{g.description}</div> : null}
              </div>
              <div className={styles.listGrid}>
                {g.columns.map((c) => (
                  <Link key={c.column_id} href={`/${country}/columns/${c.column_id}`} style={{ textDecoration: 'none' }}>
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
          title="コラムがありません"
          description="まだ公開されたコラムがありません。"
          action={{ label: t.nav.top, href: `/${country}` }}
        />
      )}
    </main>
  )
}


