import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'
import styles from '../../columns.module.css'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'
import { WriterLink } from '@/components/columns/WriterLink'

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

function joinUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/, '')
  const k = key.replace(/^\/+/, '')
  return `${b}/${k}`
}

function matchSeriesSlug(slug: string, c: ColumnsResponse['columns'][number]) {
  const target = decodeURIComponent(String(slug || '').trim())
  const cn = c.column_name
  if (!cn) return false
  return cn.slug === target || cn.column_name_id === target
}

export async function generateMetadata({ params }: { params: { country: string; slug: string } }) {
  const { country, slug } = params
  if (!isCountry(country)) return {}
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const canonical = canonicalUrl(`/${country}/columns/series/${encodeURIComponent(slug)}`)

  try {
    const data = await fetchJson<ColumnsResponse>(`/v1/${country}/columns?limit=200`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
    const series = data.columns.find((c) => matchSeriesSlug(slug, c))?.column_name
    const titleCore = series?.name || (isJa ? 'コラム' : 'Columns')
    const desc = series?.description || undefined
    return generateSEOMetadata({
      title: titleCore,
      description: desc,
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: isJa ? 'コラム' : 'Columns',
      canonical,
    })
  }
}

export default async function ColumnSeriesPage({ params }: { params: { country: string; slug: string } }) {
  const { country, slug } = params
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const t = getTranslationsForCountry(country, lang)
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnsResponse>(`/v1/${country}/columns?limit=200`, {
    next: { revalidate: CACHE_POLICY.stable },
  })

  const items = data.columns.filter((c) => matchSeriesSlug(slug, c))
  if (!items.length) return notFound()

  const series = items[0].column_name
  const title = series?.name || (isJa ? 'コラム' : 'Columns')
  const description = series?.description || null

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

  items.sort((a, b) => {
    const ax = a.published_at || a.updated_at || ''
    const ay = b.published_at || b.updated_at || ''
    return ay.localeCompare(ax)
  })

  return (
    <main>
      <div className={styles.seriesHeader}>
        <div>
          <Link href={`/${country}/columns`} className={styles.seriesBackLink}>
            {isJa ? '← コラム一覧' : '← Columns'}
          </Link>
          <h1 className={styles.seriesTitle}>{title}</h1>
          {description ? <div className={styles.seriesDescription}>{description}</div> : null}
        </div>
        <div className={styles.seriesCount}>{isJa ? `${items.length} 本` : `${items.length} articles`}</div>
      </div>

      <div className={styles.listGrid}>
        {items.map((c) => (
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

      <div style={{ height: 12 }} />
      <div className={styles.bottomNav}>
        <Link href={`/${country}`} className={styles.bottomLink}>
          ← {t.nav.top}
        </Link>
      </div>
    </main>
  )
}
