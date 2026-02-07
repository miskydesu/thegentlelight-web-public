import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl, getCountrySeoMeta } from '@/lib/seo'
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
  // Remove script/style/iframe/object/embed tags and their contents (very defensive)
  s = s.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  // Remove on* handlers
  s = s.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
  // Disallow javascript: URLs in href/src
  s = s.replace(/\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  return s
}

function normalizeMarkdownForRender(md: string): string {
  // Defensive normalization:
  // Some inputs may contain escaped markdown markers (e.g. "\\*\\*bold\\*\\*") or HTML entities ("&ast;")
  // which would otherwise render as literal "**" in the column view.
  let s = String(md || '')
  // Decode asterisk entities commonly produced by some converters
  s = s.replace(/&ast;/g, '*').replace(/&#42;/g, '*')
  // Unescape backslash-escaped emphasis markers
  s = s.replace(/\\\*/g, '*').replace(/\\_/g, '_')

  // CommonMark-style emphasis rules can fail for CJK when **...** is inside a "word"
  // (e.g. "つまり**と**で"). In that case, render as HTML <strong> so it always shows as bold.
  // NOTE: tsconfig target is es5, so avoid Unicode property escapes like \p{L}.
  const isWordChar = (ch: string) => {
    if (!ch) return false
    const code = ch.charCodeAt(0)
    // ASCII letters/digits
    if ((code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122)) return true
    // Hiragana, Katakana, CJK Unified Ideographs, Halfwidth Katakana
    if ((code >= 0x3040 && code <= 0x30ff) || (code >= 0x4e00 && code <= 0x9fff) || (code >= 0xff66 && code <= 0xff9d)) return true
    // Fullwidth alnum
    if ((code >= 0xff10 && code <= 0xff19) || (code >= 0xff21 && code <= 0xff3a) || (code >= 0xff41 && code <= 0xff5a)) return true
    return false
  }
  const convertInWordStrong = (input: string): string => {
    let out = ''
    let i = 0
    while (i < input.length) {
      const start = input.indexOf('**', i)
      if (start < 0) {
        out += input.slice(i)
        break
      }
      const end = input.indexOf('**', start + 2)
      if (end < 0) {
        out += input.slice(i)
        break
      }
      const prev = start > 0 ? input[start - 1] : ''
      const next = end + 2 < input.length ? input[end + 2] : ''
      const content = input.slice(start + 2, end)
      out += input.slice(i, start)
      if (content && isWordChar(prev) && isWordChar(next)) {
        out += `<strong>${content}</strong>`
      } else {
        out += `**${content}**`
      }
      i = end + 2
    }
    return out
  }
  s = convertInWordStrong(s)
  return s
}

function renderMarkdownToSafeishHtml(md: string): string {
  marked.setOptions({
    gfm: true,
    breaks: false, // keep markdown semantics; "two spaces + newline" will still create <br>
  })
  const raw = marked.parse(normalizeMarkdownForRender(String(md || ''))) as string
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

  // columns配下は layout 側で " | TGL..." が付与される。
  // 国別suffix（例: " (US)"）を考慮して、%s側を少し短めに丸める。
  const clampTitle = (raw: string, maxCore: number) => {
    const v = String(raw || '').replace(/\s+/g, ' ').trim()
    if (!v) return ''
    if (v.length <= maxCore) return v
    return `${v.slice(0, Math.max(0, maxCore - 1)).trim()}…`
  }
  const countrySuffix = getCountrySeoMeta(country).titleSuffix
  const templateExtra = (isJa ? ` | やさしいニュース TGL${countrySuffix}` : ` | TGL${countrySuffix}`).length
  const MAX_CORE = Math.max(30, 70 - templateExtra)

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
    const suffix = isJa ? `（${name}）` : ` (${name})`
    if (d.endsWith(suffix)) return d
    return `${d}${suffix}`
  }

  try {
    const data = await fetchJson<ColumnDetailResponse>(`/v1/${country}/columns/${encodeURIComponent(columnId)}`, {
      // コラム詳細は管理画面からSEO項目（title/description/keywords）が編集されるため、
      // 反映の遅れがユーザー体験/検証の妨げになりやすい。
      // - 開発: 即時反映（no-store）
      // - 本番: 2分程度で追従（frequent）
      ...(process.env.NODE_ENV === 'development'
        ? ({ cache: 'no-store' } as any)
        : { next: { revalidate: CACHE_POLICY.frequent } }),
    })
    const c = data.column
    const titleCoreRaw = String(c?.seo_title || c?.title || '').trim()
    const titleCore = clampTitle(titleCoreRaw, MAX_CORE)
    const desc = String(c?.seo_description || c?.excerpt || '').trim()
    const columnName = String(c?.column_name?.name || '').trim() || null
    const descWithColumnName = appendColumnNameToDescription(desc, columnName)

    // keywords:
    // - 管理画面で入れた seo_keywords（カンマ/改行区切り）を先頭に
    // - 共通語（コラム性）と、コラム名（シリーズ名）を末尾に付与
    const customKeywords = splitKeywords(String(c?.seo_keywords || ''))
    const commonKeywords = isJa ? ['コラム'] : ['columns']
    const columnNameKeywords = columnName ? [columnName] : []
    const keywords = uniq([...customKeywords, ...commonKeywords, ...columnNameKeywords])

    return generateSEOMetadata({
      // タイトルに The Gentle Light を直接入れると absolute 扱いになり、country suffix が付かないため避ける
      title: titleCore || (isJa ? 'コラム' : 'Columns'),
      description: descWithColumnName || undefined,
      keywords: keywords.length ? keywords : undefined,
      type: 'article',
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: isJa ? 'コラム' : 'Columns',
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
    ...(process.env.NODE_ENV === 'development'
      ? ({ cache: 'no-store' } as any)
      : { next: { revalidate: CACHE_POLICY.frequent } }),
  })
  const c = data.column
  if (!c) return notFound()

  const seriesSlug = c.column_name?.slug || c.column_name?.column_name_id || null
  const coverSrc = imageBase && c.cover_image_key ? joinUrl(imageBase, c.cover_image_key) : null
  const html = c.body_md ? renderMarkdownToSafeishHtml(replaceCountryToken(c.body_md, country)) : ''

  return (
    <main className={styles.page}>
      {/* Ensure sidebar CSS override is applied immediately (before hydration) */}
      <script
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.setAttribute('data-tgl-page','columns');",
        }}
      />
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
            {c.writers?.length
              ? c.writers.map((w) => {
                  const label = (isJa ? w.writer_name_jp : w.writer_name_en) || w.writer_name_en || w.writer_name_jp
                  if (!label || !w.writer_id) return null
                  return (
                    <Link key={w.writer_id} href={`/${country}/writers/${encodeURIComponent(w.writer_id)}`} className={styles.writerPill}>
                      {label}
                    </Link>
                  )
                })
              : c.writer_name
                ? <span className={styles.countPill}>{c.writer_name}</span>
                : null}
            {c.column_name?.name && seriesSlug ? (
              <Link href={`/${country}/columns/series/${encodeURIComponent(seriesSlug)}`} className={styles.seriesLink}>
                {isJa ? `シリーズ: ${c.column_name.name}` : `Series: ${c.column_name.name}`}
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


