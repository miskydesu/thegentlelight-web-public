import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'
import { marked } from 'marked'
import styles from '../../../[country]/columns/[columnId]/columnDetail.module.css'
import { Card, CardContent, CardMeta, CardTitle } from '@/components/ui/Card'
import { getCountryPreferenceHint, getPreferredCountry } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

type ColumnDetailResponse = {
  column: {
    column_id: string
    title: string | null
    slug: string | null
    excerpt: string | null
    body_md: string | null
    seo_title: string | null
    seo_description: string | null
    seo_keywords?: string | null
    tags: string[]
    cover_image_key: string | null
    column_name?: { column_name_id?: string; slug?: string; name: string } | null
    writer_name?: string | null
    writer_name_en?: string | null
    writer_name_jp?: string | null
    writers?: Array<{ writer_id: string; writer_name_en: string | null; writer_name_jp: string | null }>
    published_at: string | null
    updated_at: string | null
  }
  meta: ApiMeta
}

function joinUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/, '')
  const k = key.replace(/^\/+/, '')
  return `${b}/${k}`
}

function sanitizeHtmlLoosely(html: string): string {
  let s = String(html || '')
  s = s.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  s = s.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
  s = s.replace(/\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  return s
}

function normalizeMarkdownForRender(md: string): string {
  let s = String(md || '')
  s = s.replace(/&ast;/g, '*').replace(/&#42;/g, '*')
  s = s.replace(/\\\*/g, '*').replace(/\\_/g, '_')
  return s
}

function renderMarkdownToSafeishHtml(md: string): string {
  marked.setOptions({ gfm: true, breaks: false })
  const raw = marked.parse(normalizeMarkdownForRender(String(md || ''))) as string
  return sanitizeHtmlLoosely(raw)
}

function replaceCountryToken(input: string, country: string): string {
  return String(input || '').split('{country}').join(country)
}

export async function generateMetadata({ params }: { params: { columnId: string } }) {
  const { columnId } = params
  const canonical = canonicalUrl(`/en/columns/${encodeURIComponent(columnId)}`)

  const splitKeywords = (raw: string) =>
    String(raw || '')
      .split(/[,\n]/g)
      .map((s) => s.trim())
      .filter(Boolean)

  const uniq = (xs: string[]) => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const x of xs) {
      const k = x.toLowerCase()
      if (seen.has(k)) continue
      seen.add(k)
      out.push(x)
    }
    return out
  }

  const appendColumnNameToDescription = (desc: string, columnName: string | null) => {
    const d = String(desc || '').trim()
    const name = String(columnName || '').trim()
    if (!d || !name) return d
    const suffix = ` (${name})`
    if (d.endsWith(suffix)) return d
    return `${d}${suffix}`
  }

  try {
    const sourceCountry = 'ca'
    const data = await fetchJson<ColumnDetailResponse>(`/v1/${sourceCountry}/columns/${encodeURIComponent(columnId)}`, {
      ...(process.env.NODE_ENV === 'development'
        ? ({ cache: 'no-store' } as any)
        : { next: { revalidate: CACHE_POLICY.frequent } }),
    })
    const c = data.column
    const titleCore = String(c?.seo_title || c?.title || '').trim()
    const desc = String(c?.seo_description || c?.excerpt || '').trim()
    const columnName = String(c?.column_name?.name || '').trim() || null
    const descWithColumnName = appendColumnNameToDescription(desc, columnName)

    const customKeywords = splitKeywords(String(c?.seo_keywords || ''))
    const commonKeywords = ['columns']
    const columnNameKeywords = columnName ? [columnName] : []
    const keywords = uniq([...customKeywords, ...commonKeywords, ...columnNameKeywords])

    return generateSEOMetadata({
      title: titleCore || 'Columns',
      description: descWithColumnName || undefined,
      keywords: keywords.length ? keywords : undefined,
      type: 'article',
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: 'Columns',
      canonical,
    })
  }
}

export default async function EnColumnDetailPage({ params }: { params: { columnId: string } }) {
  const pref = getCountryPreferenceHint()
  const preferred = getPreferredCountry()
  const sourceCountry = 'ca'
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''

  const data = await fetchJson<ColumnDetailResponse>(`/v1/${sourceCountry}/columns/${encodeURIComponent(params.columnId)}`, {
    ...(process.env.NODE_ENV === 'development' ? ({ cache: 'no-store' } as any) : { next: { revalidate: CACHE_POLICY.frequent } }),
  }).catch(() => null)
  if (!data?.column) return notFound()
  const c = data.column

  const coverSrc = imageBase && c.cover_image_key ? joinUrl(imageBase, c.cover_image_key) : null
  const seriesSlug = c.column_name?.slug || c.column_name?.column_name_id || null
  // column本文内の /{country}/... トークンは、ユーザーの「ニュース版」へ寄せる
  const html = c.body_md ? renderMarkdownToSafeishHtml(replaceCountryToken(c.body_md, preferred)) : ''

  return (
    <main className={styles.page}>
      {/* Ensure sidebar CSS override is applied immediately (before hydration) */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.setAttribute('data-tgl-page','columns');",
        }}
      />
      <div className={styles.pageHeader}>
        <Link href={`/en/columns`} style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>
          ← Columns
        </Link>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Reading</span>
      </div>

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="columns"
        inferredCountry={pref.source === 'geo' ? pref.country : null}
        inferredSource={pref.source}
      />

      <Card className={styles.topCard} style={{ ['--cat-color' as any]: '#d63384' } as any}>
        <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
          <span className={styles.cardTitleAccent}>{c.title || '—'}</span>
        </CardTitle>
        <CardMeta className={styles.metaRow}>
          <span className={styles.metaLeft}>
            {c.writers?.length
              ? c.writers.map((w) => {
                  const label = w.writer_name_en || w.writer_name_jp
                  if (!label || !w.writer_id) return null
                  return (
                    <Link key={w.writer_id} href={`/en/writers/${encodeURIComponent(w.writer_id)}`} className={styles.writerPill}>
                      {label}
                    </Link>
                  )
                })
              : c.writer_name
                ? <span className={styles.countPill}>{c.writer_name}</span>
                : null}
            {c.column_name?.name && seriesSlug ? (
              <Link href={`/en/columns/series/${encodeURIComponent(seriesSlug)}`} className={styles.seriesLink}>
                {`Series: ${c.column_name.name}`}
              </Link>
            ) : null}
            {c.tags?.length
              ? c.tags.slice(0, 8).map((tag) => (
                  <span key={tag} className={styles.categoryBadge}>
                    {tag}
                  </span>
                ))
              : null}
          </span>
          {c.published_at ? <span className={styles.metaRight}>{new Date(c.published_at).toLocaleString()}</span> : null}
        </CardMeta>
        {c.excerpt ? (
          <CardContent style={{ marginTop: 8 }}>
            <div className={styles.bodyText}>{c.excerpt}</div>
          </CardContent>
        ) : null}
      </Card>

      {coverSrc ? (
        <>
          <div style={{ height: 12 }} />
          <Card className={`${styles.topCard} ${styles.coverCard}`}>
            <img className={styles.cover} src={coverSrc} alt="" loading="lazy" />
          </Card>
        </>
      ) : null}

      <div style={{ height: 12 }} />

      <Card className={styles.topCard}>
        <CardContent>
          {c.body_md ? (
            <div className={styles.markdown} dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <div className={styles.mutedText}>(No content.)</div>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 12 }} />
      <div className={styles.bottomNav}>
        <Link href={`/${preferred}`} className={styles.bottomLink}>
          ← Home
        </Link>
      </div>
    </main>
  )
}

