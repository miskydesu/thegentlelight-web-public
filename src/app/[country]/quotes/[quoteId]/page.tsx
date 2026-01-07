import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'

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

export async function generateMetadata({ params }: { params: { country: string; quoteId: string } }) {
  const { country, quoteId } = params
  if (!isCountry(country)) return {}
  const canonical = canonicalUrl(`/${country}/quotes/${encodeURIComponent(quoteId)}`)
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'
  const siteName = 'The Gentle Light'

  const snippet = (s: string, max: number) => {
    const v = String(s || '').replace(/\s+/g, ' ').trim()
    if (!v) return ''
    if (v.length <= max) return v
    return `${v.slice(0, Math.max(0, max)).trim()}…`
  }

  try {
    const data = await fetchJson<QuoteDetailResponse>(`/v1/${country}/quotes/${encodeURIComponent(quoteId)}`, { next: { revalidate: CACHE_POLICY.stable } })
    const q = data.quote
    const text = String(q?.quote_text || '').trim()
    const titleCore = text ? snippet(text, isJa ? 40 : 70) : (isJa ? '名言' : 'Quote')
    const desc = String(q?.note || '').trim() || (q?.author_name ? `— ${q.author_name}` : '')
    return generateSEOMetadata({
      title: `${titleCore}｜${siteName}`,
      description: desc || undefined,
      keywords: isJa ? ['名言', 'テーマ'] : ['quotes', 'theme'],
      type: 'article',
      canonical,
    })
  } catch {
    return generateSEOMetadata({
      title: `${isJa ? '名言' : 'Quote'}｜${siteName}`,
      canonical,
    })
  }
}

export default async function QuoteDetailPage({ params }: { params: { country: string; quoteId: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)

  const [data, themesData] = await Promise.all([
    fetchJson<QuoteDetailResponse>(`/v1/${country}/quotes/${encodeURIComponent(params.quoteId)}`, { next: { revalidate: CACHE_POLICY.stable } }),
    fetchJson<QuoteThemesResponse>(`/v1/${country}/quotes/themes`, { next: { revalidate: CACHE_POLICY.stable } }),
  ])
  const q = data.quote
  if (!q) return notFound()

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

  return (
    <main>
      <div style={{ marginBottom: 12 }}>
        <Link href={`/${country}/quotes`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          {t.pages.quotes.backToList}
        </Link>
      </div>

      <h1 style={{ fontSize: '1.6rem', marginBottom: 12, lineHeight: 1.6 }}>
        {q.quote_text || '—'}
      </h1>
      <div style={{ color: 'var(--muted)', marginBottom: 14, lineHeight: 1.6 }}>
        {q.author_name ? <span>{q.author_name}</span> : null}
        {q.source_text ? <span>{q.author_name ? ' / ' : ''}{q.source_text}</span> : null}
      </div>
      {q.note ? <div style={{ color: 'var(--muted)', lineHeight: 1.7 }}>{q.note}</div> : null}
      {themeKey ? (
        <div style={{ marginTop: 14 }}>
          <div className={styles.tagsRow}>
            <Link
              key={themeKey}
              href={`/${country}/quotes?theme=${encodeURIComponent(themeKey)}`}
              className={styles.tagPill}
              title={lang === 'ja' ? `テーマ「${themeLabel}」で絞り込み` : `Filter by theme: ${themeLabel}`}
            >
              {themeLabel}
            </Link>
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <Link href={`/${country}`} style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}>
          ← {t.nav.top}
        </Link>
      </div>
    </main>
  )
}


