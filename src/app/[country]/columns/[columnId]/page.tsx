import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CACHE_POLICY } from '@/lib/cache-policy'

type ColumnDetailResponse = {
  column: {
    column_id: string
    title: string | null
    slug: string | null
    excerpt: string | null
    body_md: string | null
    seo_title: string | null
    seo_description: string | null
    tags: string[]
    cover_image_key: string | null
    writer_name?: string | null
    writer_name_en?: string | null
    writer_name_jp?: string | null
    published_at: string | null
    updated_at: string | null
  }
  meta: ApiMeta
}

export default async function ColumnDetailPage({ params }: { params: { country: string; columnId: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)

  const data = await fetchJson<ColumnDetailResponse>(`/v1/${country}/columns/${encodeURIComponent(params.columnId)}`, {
    next: { revalidate: CACHE_POLICY.stable },
  })
  const c = data.column
  if (!c) return notFound()

  return (
    <main>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/${country}/columns`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {lang === 'ja' ? '← コラム一覧へ' : '← Back to columns'}
        </Link>
      </div>

      <h1 style={{ fontSize: '1.6rem', marginBottom: 10 }}>{c.title || '(no title)'}</h1>
      <div style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 18 }}>
        {c.writer_name ? <span>{c.writer_name}</span> : null}
        {c.writer_name && c.published_at ? <span>{' · '}</span> : null}
        {c.published_at ? new Date(c.published_at).toLocaleString() : null}
      </div>

      {c.body_md ? (
        <article style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{c.body_md}</article>
      ) : (
        <div style={{ color: 'var(--muted)' }}>{lang === 'ja' ? '本文がありません。' : 'No content.'}</div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/${country}`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          ← {t.nav.top}
        </Link>
      </div>
    </main>
  )
}


