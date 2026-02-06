import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import styles from '../../../[country]/quotes/[quoteId]/quoteDetail.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflangSharedEn, generateSEOMetadata } from '@/lib/seo-helpers'
import { Card, CardContent, CardMeta, CardTitle } from '@/components/ui/Card'
import { getCountryPreferenceHint, getPreferredCountry } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

type QuoteDetailResponse = {
  quote: {
    quote_id: string
    author_name: string | null
    source_text: string | null
    quote_text: string | null
    note: string | null
    tags: string[]
    created_at: string | null
    updated_at: string | null
  }
  meta: ApiMeta
}

type QuoteThemesResponse = {
  themes: Array<{
    theme: string
    theme_tag: string
    theme_name: string | null
    count: number
    display_order: number | null
  }>
  meta: ApiMeta
}

export async function generateMetadata({ params }: { params: { quoteId: string } }) {
  const { quoteId } = params
  const canonical = canonicalUrl(`/en/quotes/${encodeURIComponent(quoteId)}`)
  const hreflang = generateHreflangSharedEn(`/quotes/${encodeURIComponent(quoteId)}`)
  const siteName = 'The Gentle Light'

  const snippet = (s: string, max: number) => {
    const v = String(s || '').replace(/\s+/g, ' ').trim()
    if (!v) return ''
    if (v.length <= max) return v
    return `${v.slice(0, Math.max(0, max)).trim()}…`
  }

  try {
    const sourceCountry = 'ca'
    const [data, themesData] = await Promise.all([
      fetchJson<QuoteDetailResponse>(`/v1/${sourceCountry}/quotes/${encodeURIComponent(quoteId)}`, {
        ...(process.env.NODE_ENV === 'development' ? ({ cache: 'no-store' } as any) : { next: { revalidate: CACHE_POLICY.stable } }),
      }),
      fetchJson<QuoteThemesResponse>(`/v1/${sourceCountry}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }),
    ])
    const q = data.quote
    const author = String(q?.author_name || '').trim()
    const source = String(q?.source_text || '').trim()
    const text = String(q?.quote_text || '').trim()
    const titleCore = text ? snippet(text, 70) : 'Quote'
    const note = String(q?.note || '').trim()
    const descBody = note || (author ? 'A calm look at the meaning and context behind this quote.' : '')
    const title = author ? `${titleCore}｜${author}｜${siteName}` : `${titleCore}｜${siteName}`
    const desc = author ? `${author}${source ? ` / ${source}` : ''}：${descBody}`.trim() : descBody

    // theme:* のローカライズ名を keywords に含める
    const themeNameByTheme = new Map<string, string>()
    for (const th of themesData.themes || []) {
      const key = String(th.theme || '').trim()
      if (!key) continue
      const name = String(th.theme_name || '').trim()
      if (name) themeNameByTheme.set(key, name)
    }
    const themeTag = (q.tags || []).find((x) => typeof x === 'string' && x.startsWith('theme:')) || ''
    const themeKey = themeTag ? themeTag.slice('theme:'.length) : ''
    const themeLabel = themeKey ? themeNameByTheme.get(themeKey) || themeKey : ''

    const keywordsBase = ['quotes', 'theme']
    const keywords = [author, source, themeLabel, ...keywordsBase].map((x) => String(x || '').trim()).filter(Boolean)

    return generateSEOMetadata({
      title,
      description: desc || undefined,
      keywords: keywords.length ? keywords : keywordsBase,
      type: 'article',
      canonical,
      hreflang,
    })
  } catch {
    return generateSEOMetadata({
      title: `Quote｜${siteName}`,
      canonical,
      hreflang,
    })
  }
}

export default async function EnQuoteDetailPage({ params }: { params: { quoteId: string } }) {
  const pref = getCountryPreferenceHint()
  const preferred = getPreferredCountry()
  const sourceCountry = 'ca'

  const [data, themesData] = await Promise.all([
    fetchJson<QuoteDetailResponse>(`/v1/${sourceCountry}/quotes/${encodeURIComponent(params.quoteId)}`, {
      ...(process.env.NODE_ENV === 'development' ? ({ cache: 'no-store' } as any) : { next: { revalidate: CACHE_POLICY.stable } }),
    }).catch(() => null),
    fetchJson<QuoteThemesResponse>(`/v1/${sourceCountry}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }).catch(() => null),
  ])
  if (!data?.quote || !themesData) return notFound()
  const q = data.quote

  const themeNameByTheme = new Map<string, string>()
  for (const th of themesData.themes || []) {
    const key = String(th.theme || '').trim()
    if (!key) continue
    const name = String(th.theme_name || '').trim()
    if (name) themeNameByTheme.set(key, name)
  }

  const themeTag = (q.tags || []).find((x) => typeof x === 'string' && x.startsWith('theme:')) || ''
  const themeKey = themeTag ? themeTag.slice('theme:'.length) : ''
  const themeLabel = themeKey ? themeNameByTheme.get(themeKey) || themeKey : ''

  const authorName = String(q.author_name || '').trim()
  const dateIso = q.updated_at || q.created_at
  const dateText = dateIso ? new Date(dateIso).toLocaleDateString('en', { year: 'numeric', month: '2-digit', day: '2-digit' }) : null

  return (
    <main className={styles.page}>
      <div className={styles.topNav}>
        <Link href={`/en/quotes`} className={styles.backLink}>
          ← Quotes
        </Link>
      </div>

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="quotes"
        inferredCountry={pref.source === 'geo' ? pref.country : null}
        inferredSource={pref.source}
      />

      <Card className={styles.headerCard}>
        <CardTitle as="h1" className={styles.title}>
          <span className={styles.cardTitleAccent}>Quote</span>
        </CardTitle>

        <blockquote className={styles.quoteBlock}>
          <p className={styles.quoteText}>{q.quote_text || '—'}</p>
        </blockquote>

        <CardMeta className={styles.metaRow}>
          <span className={styles.metaLeft}>
            {q.author_name ? <span className={styles.authorName}>{q.author_name}</span> : null}
            {q.source_text ? <span className={styles.sourceText}>{q.source_text}</span> : null}
          </span>
          {dateText ? <span className={styles.metaRight}>{dateText}</span> : null}
        </CardMeta>

        {themeKey ? (
          <div className={styles.tagsRow}>
            <Link
              key={themeKey}
              href={`/en/quotes/theme/${encodeURIComponent(themeKey)}`}
              className={styles.tagPill}
              title={`Filter by theme: ${themeLabel}`}
            >
              {themeLabel}
            </Link>
          </div>
        ) : null}
      </Card>

      {q.note ? (
        <Card className={styles.noteCard} as="section">
          <CardTitle as="h2" className={styles.sectionTitle}>
            Note
          </CardTitle>
          <CardContent className={styles.noteText}>
            <p>{q.note}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className={styles.bottomNav}>
        {authorName ? (
          <Link
            href={`/en/quotes?q=${encodeURIComponent(authorName)}`}
            className={styles.bottomLink}
            title={`Search quotes by ${authorName}`}
          >
            {`More quotes by ${authorName}`}
          </Link>
        ) : null}
        <Link href={`/${preferred}`} className={styles.bottomLink}>
          ← Home
        </Link>
      </div>
    </main>
  )
}

