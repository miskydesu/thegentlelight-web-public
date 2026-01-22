import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'
import styles from '@/app/[country]/columns/columns.module.css'
import { Card, CardContent, CardTitle } from '@/components/ui/Card'

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

function resolveWriterName(
  writers: Array<{ writer_id: string; writer_name_en: string | null; writer_name_jp: string | null }> | undefined,
  writerId: string
) {
  const found = writers?.find((w) => w.writer_id === writerId)
  if (!found) return null
  return found.writer_name_en || found.writer_name_jp || null
}

export async function generateMetadata({ params }: { params: { writerId: string } }) {
  const { writerId } = params
  const canonical = canonicalUrl(`/en/writers/${encodeURIComponent(writerId)}`)

  try {
    const sourceCountry = 'ca'
    const data = await fetchJson<ColumnsResponse>(`/v1/${sourceCountry}/columns?limit=200`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
    const name = resolveWriterName(data.columns[0]?.writers, writerId) || 'Writer'
    return generateSEOMetadata({
      title: `${name} · Columns`,
      description: `Columns written by ${name}.`,
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: 'Writer',
      canonical,
    })
  }
}

export default async function EnWriterPage({ params }: { params: { writerId: string } }) {
  const { writerId } = params
  const sourceCountry = 'ca'
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnsResponse>(`/v1/${sourceCountry}/columns?limit=200`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()

  const items = data.columns.filter((c) => c.writers?.some((w) => w.writer_id === writerId))
  if (!items.length) return notFound()

  const writerName = resolveWriterName(items[0].writers, writerId) || 'Writer'

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
          <h1 className={styles.seriesTitle}>{writerName}</h1>
          <div className={styles.seriesDescription}>Columns written by this editor.</div>
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
                      {c.column_name?.name ? <span>{c.column_name.name}</span> : null}
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
