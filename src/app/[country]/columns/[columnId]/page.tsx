import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'
import { marked } from 'marked'
import styles from './columnDetail.module.css'
import { Card, CardContent, CardMeta, CardTitle } from '@/components/ui/Card'

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

function joinUrl(base: string, key: string): string {
  const b = base.replace(/\/+$/, '')
  const k = key.replace(/^\/+/, '')
  return `${b}/${k}`
}

function sanitizeHtmlLoosely(html: string): string {
  let s = String(html || '')
  // Remove script/style/iframe/object/embed tags and their contents (very defensive)
  s = s.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  // Remove on* handlers
  s = s.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
  // Disallow javascript: URLs in href/src
  s = s.replace(/\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  return s
}

function renderMarkdownToSafeishHtml(md: string): string {
  marked.setOptions({
    gfm: true,
    breaks: false, // keep markdown semantics; "two spaces + newline" will still create <br>
  })
  const raw = marked.parse(String(md || '')) as string
  return sanitizeHtmlLoosely(raw)
}

function replaceCountryToken(input: string, country: string): string {
  // Column body supports "{country}" token mainly for internal links like "/{country}/news".
  // Replace at render-time so the same column content can be reused across country editions.
  return String(input || '').split('{country}').join(country)
}

export async function generateMetadata({ params }: { params: { country: string; columnId: string } }) {
  const { country, columnId } = params
  if (!isCountry(country)) return {}
  const canonical = canonicalUrl(`/${country}/columns/${encodeURIComponent(columnId)}`)
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const siteName = 'The Gentle Light'

  try {
    const data = await fetchJson<ColumnDetailResponse>(`/v1/${country}/columns/${encodeURIComponent(columnId)}`, {
      next: { revalidate: CACHE_POLICY.stable },
    })
    const c = data.column
    const titleCore = String(c?.seo_title || c?.title || '').trim()
    const desc = String(c?.seo_description || c?.excerpt || '').trim()
    return generateSEOMetadata({
      title: titleCore ? `${titleCore}｜${siteName}` : `Columns｜${siteName}`,
      description: desc || undefined,
      keywords: isJa ? ['コラム', '一次コンテンツ'] : ['columns', 'original content'],
      type: 'article',
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: `Columns｜${siteName}`,
      canonical,
    })
  }
}

export default async function ColumnDetailPage({ params }: { params: { country: string; columnId: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  const imageBase = process.env.NEXT_PUBLIC_IMAGE_BASE_URL || process.env.IMAGE_BASE_URL || ''
  const isJa = lang === 'ja'

  const data = await fetchJson<ColumnDetailResponse>(`/v1/${country}/columns/${encodeURIComponent(params.columnId)}`, {
    next: { revalidate: CACHE_POLICY.stable },
  })
  const c = data.column
  if (!c) return notFound()

  const coverSrc = imageBase && c.cover_image_key ? joinUrl(imageBase, c.cover_image_key) : null
  const html = c.body_md ? renderMarkdownToSafeishHtml(replaceCountryToken(c.body_md, country)) : ''

  return (
    <main className={styles.page}>
      <div className={styles.pageHeader}>
        <Link href={`/${country}/columns`} style={{ fontSize: '0.95rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {isJa ? '← コラム' : '← Columns'}
        </Link>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{isJa ? '読みもの' : 'Reading'}</span>
      </div>

      <Card className={styles.topCard} style={{ ['--cat-color' as any]: '#d63384' } as any}>
        <CardTitle as="h1" style={{ fontSize: '1.45rem', marginBottom: 10 }}>
          <span className={styles.cardTitleAccent}>{c.title || '—'}</span>
        </CardTitle>
        <CardMeta className={styles.metaRow}>
          <span className={styles.metaLeft}>
            {c.writer_name ? <span className={styles.countPill}>{c.writer_name}</span> : null}
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
            <div className={styles.mutedText}>{isJa ? '（本文がありません）' : '(No content.)'}</div>
          )}
        </CardContent>
      </Card>

      <div style={{ height: 12 }} />
      <div className={styles.bottomNav}>
        <Link href={`/${country}`} className={styles.bottomLink}>
          ← {t.nav.top}
        </Link>
      </div>
    </main>
  )
}


