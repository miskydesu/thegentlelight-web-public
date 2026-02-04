import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type QuoteAuthorQuotesResponse, type QuoteAuthorResolveResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
import { marked } from 'marked'

function sanitizeHtmlLoosely(html: string): string {
  let s = String(html || '')
  s = s.replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
  s = s.replace(/\son\w+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, '')
  s = s.replace(/\s(href|src)\s*=\s*("|\')\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
  return s
}

function renderMarkdownToSafeishHtml(md: string): string {
  marked.setOptions({ gfm: true, breaks: false })
  const raw = marked.parse(String(md || '')) as string
  return sanitizeHtmlLoosely(raw)
}

function buildDetailPreview(md: string): string {
  const raw = String(md || '')
  const withoutCode = raw.replace(/```[\s\S]*?```/g, ' ')
  const withoutInlineCode = withoutCode.replace(/`[^`]*`/g, ' ')
  const withoutImages = withoutInlineCode.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
  const withoutLinks = withoutImages.replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
  const withoutMarkdown = withoutLinks.replace(/[#>*_\-\+]+/g, ' ')
  const compact = withoutMarkdown.replace(/\s+/g, ' ').trim()
  return compact.slice(0, 240)
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string; author: string }
  searchParams?: { cursor?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return {}
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const cursor = Number.isFinite(Number(searchParams?.cursor)) ? Math.max(0, Math.trunc(Number(searchParams?.cursor))) : 0

  const authorKey = String(decodeURIComponent(params.author || '')).trim()
  if (!authorKey) return {}

  let resolved: QuoteAuthorResolveResponse | null = null
  try {
    resolved = await fetchJson<QuoteAuthorResolveResponse>(
      `/v1/${country}/quote-authors/resolve?name=${encodeURIComponent(authorKey)}`,
      { next: { revalidate: CACHE_POLICY.stable } },
    )
  } catch {
    resolved = null
  }
  const displayName = resolved?.author?.display_name || authorKey
  const canonicalKey = resolved?.author?.canonical_key || authorKey

  const canonical = canonicalUrl(`/${country}/quotes/author/${encodeURIComponent(canonicalKey)}`)
  const hreflang = generateHreflang(`/quotes/author/${encodeURIComponent(canonicalKey)}`)

  const meta: any = {
    title: isJa ? `${displayName}の名言` : `${displayName} Quotes`,
    description: isJa ? `「${displayName}」の名言をまとめました。` : `Quotes by ${displayName}.`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
  if (cursor > 0) {
    meta.robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
    meta.alternates = { canonical }
  }
  return meta
}

export default async function QuoteAuthorPage({
  params,
  searchParams,
}: {
  params: { country: string; author: string }
  searchParams: { cursor?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  const isJa = lang === 'ja'

  const authorKey = String(decodeURIComponent(params.author || '')).trim()
  if (!authorKey) return notFound()

  const data = await fetchJson<QuoteAuthorQuotesResponse>(
    `/v1/${country}/quote-authors/${encodeURIComponent(authorKey)}/quotes?limit=20&cursor=${
      Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
    }`,
    { next: { revalidate: CACHE_POLICY.stable } },
  ).catch(() => null)
  if (!data) return notFound()
  const author = data.author
  const quotes = data.quotes || []
  const displayName = author?.display_name || authorKey
  const detailPreview = author?.detail_md ? buildDetailPreview(author.detail_md) : ''
  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const limit = 20
  const hasPrev = cursor > 0
  const nextCursorFromMeta = Number.isFinite(Number(data.meta?.next_cursor)) ? Number(data.meta?.next_cursor) : null
  const hasNext = typeof nextCursorFromMeta === 'number' ? nextCursorFromMeta > cursor : quotes.length === limit
  const nextCursor = typeof nextCursorFromMeta === 'number' ? nextCursorFromMeta : cursor + quotes.length
  const start = quotes.length > 0 ? cursor + 1 : 0
  const end = cursor + quotes.length
  const buildUrl = (nextC: number) => {
    const sp = new URLSearchParams()
    if (nextC > 0) sp.set('cursor', String(nextC))
    const qs = sp.toString()
    return `/${country}/quotes/author/${encodeURIComponent(authorKey)}${qs ? `?${qs}` : ''}`
  }

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>{isJa ? `${displayName}の名言` : `${displayName} Quotes`}</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.pages.quotes.subtitle}</span>
      </div>

      <div style={{ height: 12 }} />

      <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
        <div className={styles.themeShelfHeader}>
          <div className={styles.themeShelfTitle}>{isJa ? '著者' : 'Author'}</div>
          <div className={styles.shelfActions}>
            <Link href={`/${country}/quotes/authors`} className={styles.shelfLink}>
              {isJa ? '著者一覧へ' : 'All Authors'}
            </Link>
            <Link href={`/${country}/quotes`} className={styles.shelfLink}>
              {isJa ? '名言トップへ' : 'Quotes'}
            </Link>
          </div>
        </div>

        <div className={styles.authorShelfGrid}>
          <div className={`${styles.themeItem} ${styles.themeItemActive}`}>
            <span className={styles.themeLabel}>{displayName}</span>
            <span className={styles.themeCount}>{`${end}${hasNext ? '+' : ''}`}</span>
          </div>
        </div>
      </div>

      {author ? (
        <div className={styles.authorProfile}>
          {author.detail_md ? (
            <details className={styles.authorDetailDisclosure}>
              <summary className={styles.authorDetailSummary}>
                <div className={styles.authorSummaryMain}>
                  <div className={styles.authorName}>{displayName}</div>
                  {author.one_liner ? <div className={styles.authorOneLiner}>{author.one_liner}</div> : null}
                  {author.type ? (
                    <div className={styles.authorMeta}>
                      {author.type ? <span>{author.type}</span> : null}
                    </div>
                  ) : null}
                  {detailPreview ? <div className={styles.authorDetailPreview}>{detailPreview}</div> : null}
                  <div className={styles.authorDetailHint}>{isJa ? 'タップで詳細を開く' : 'Tap to expand for details'}</div>
                </div>
                <span className={styles.authorDetailToggle}>
                  <span className={styles.authorDetailToggleOpen}>
                    <span className={styles.authorDetailToggleIcon}>+</span>
                    {isJa ? '詳細' : 'Details'}
                  </span>
                  <span className={styles.authorDetailToggleClose}>
                    <span className={styles.authorDetailToggleIcon}>-</span>
                    {isJa ? '閉じる' : 'Close'}
                  </span>
                </span>
              </summary>
              <div className={styles.authorDetailBody}>
                <div className={styles.authorDetailContent} dangerouslySetInnerHTML={{ __html: renderMarkdownToSafeishHtml(author.detail_md) }} />
              </div>
            </details>
          ) : (
            <div className={styles.authorProfileHeader}>
              <div>
                <div className={styles.authorName}>{displayName}</div>
                {author.one_liner ? <div className={styles.authorOneLiner}>{author.one_liner}</div> : null}
                {author.type ? (
                  <div className={styles.authorMeta}>
                    {author.type ? <span>{author.type}</span> : null}
                  </div>
                ) : null}
              </div>
            </div>
          )}
          {Array.isArray(author.links) && author.links.length ? (
            <div className={styles.authorLinks}>
              {author.links.map((link: any, idx: number) => {
                const label = String(link?.label || link?.title || '').trim()
                const url = String(link?.url || '').trim()
                if (!label || !url) return null
                return (
                  <a key={`${url}-${idx}`} href={url} className={styles.authorLink} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                )
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {quotes.length ? (
        <>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              {start && end ? (lang === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </span>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{lang === 'ja' ? `1ページ ${limit}件` : `${limit} per page`}</span>
          </div>

          <div className={styles.listGrid}>
            {quotes.map((q) => (
            <Card key={q.quote_id} className={styles.topCard}>
              <Link href={`/${country}/quotes/${q.quote_id}`} className={styles.mainLink}>
                <CardTitle className={styles.quoteTitle}>{q.quote_text || '—'}</CardTitle>
                <div className={styles.metaRow}>
                  {q.author_name ? <span>{q.author_name}</span> : null}
                  {q.source_text ? <span>{q.author_name ? ' / ' : ''}{q.source_text}</span> : null}
                </div>
              </Link>
            </Card>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {start && end ? (lang === 'ja' ? `表示：${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {lang === 'ja' ? '戻る' : 'Back'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {lang === 'ja' ? '戻る' : 'Back'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(nextCursor)}>
                  {lang === 'ja' ? 'もう少し読む' : 'Read a little more'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {lang === 'ja' ? 'もう少し読む' : 'Read a little more'}
                </span>
              )}
            </div>
          </div>

          {!hasNext ? (
            <div style={{ marginTop: 18, padding: '12px 12px', borderRadius: 10, background: 'rgba(0, 0, 0, 0.03)', color: 'var(--text)', lineHeight: 1.6 }}>
              {lang === 'ja' ? (
                <>
                  今日は、これくらいでも十分です。
                  <br />
                  また、必要なときに。
                </>
              ) : (
                <>
                  This is enough for today.
                  <br />
                  Come back when you need a gentle moment.
                </>
              )}
            </div>
          ) : null}
        </>
      ) : (
        <EmptyState
          title={isJa ? '名言が見つかりません' : 'No quotes found'}
          description={isJa ? '著者名の表記ゆれがある可能性があります。' : 'There may be author name variations.'}
          action={{ label: isJa ? '著者一覧' : 'Authors', href: `/${country}/quotes/authors` }}
        />
      )}
    </main>
  )
}

