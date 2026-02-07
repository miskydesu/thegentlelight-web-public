import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflangSharedEn, generateSEOMetadata } from '@/lib/seo-helpers'
import styles from '@/app/[country]/columns/columns.module.css'
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

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params
  const canonical = canonicalUrl(`/en/columns/series/${encodeURIComponent(slug)}`)
  const hreflang = generateHreflangSharedEn(`/columns/series/${encodeURIComponent(slug)}`)

  // /en/columns は layout 側で "%s | TGL" を付与する。
  // Series名が長い場合に備えて title を軽く丸める（70文字目安）。
  const clampTitle = (raw: string, maxCore: number) => {
    const v = String(raw || '').replace(/\s+/g, ' ').trim()
    if (!v) return ''
    if (v.length <= maxCore) return v
    return `${v.slice(0, Math.max(0, maxCore - 1)).trim()}…`
  }
  const MAX_CORE = 64

  try {
    const sourceCountry = 'ca'
    const data = await fetchJson<ColumnsResponse>(`/v1/${sourceCountry}/columns?limit=200`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
    const series = data.columns.find((c) => matchSeriesSlug(slug, c))?.column_name
    const titleCore = clampTitle(series?.name || 'Columns', MAX_CORE)
    const desc = series?.description || undefined
    return generateSEOMetadata({
      title: titleCore,
      description: desc,
      canonical,
      hreflang,
    })
  } catch {
    return generateSEOMetadata({
      title: 'Columns',
      canonical,
      hreflang,
    })
  }
}

export default async function EnColumnSeriesPage({ params }: { params: { slug: string } }) {
  const { slug } = params
  const sourceCountry = 'ca'
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnsResponse>(`/v1/${sourceCountry}/columns?limit=200`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()

  const items = data.columns.filter((c) => matchSeriesSlug(slug, c))
  if (!items.length) return notFound()

  const series = items[0].column_name
  const title = series?.name || 'Columns'
  const description = series?.description || null

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

  items.sort((a, b) => {
    const ax = a.published_at || a.updated_at || ''
    const ay = b.published_at || b.updated_at || ''
    return ay.localeCompare(ax)
  })

  return (
    <main>
      <div className={styles.seriesHeader}>
        <div>
          <Link href="/en/columns" className={styles.seriesBackLink}>
            ← Columns
          </Link>
          <h1 className={styles.seriesTitle}>{title}</h1>
          {description ? <div className={styles.seriesDescription}>{description}</div> : null}
        </div>
        <div className={styles.seriesCount}>{`${items.length} articles`}</div>
      </div>

      <div className={styles.listGrid}>
        {items.map((c) => (
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
    </main>
  )
}
