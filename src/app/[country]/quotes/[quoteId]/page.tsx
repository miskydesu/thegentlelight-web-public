import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from './quoteDetail.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateSEOMetadata } from '@/lib/seo-helpers'
import { Card, CardContent, CardMeta, CardTitle } from '@/components/ui/Card'

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
    const author = String(q?.author_name || '').trim()
    const source = String(q?.source_text || '').trim()
    const text = String(q?.quote_text || '').trim()
    const titleCore = text ? snippet(text, isJa ? 40 : 70) : (isJa ? '名言' : 'Quote')
    const note = String(q?.note || '').trim()
    const descBody =
      note ||
      (author
        ? isJa
          ? '名言の背景や意味を静かに紹介します。'
          : 'A calm look at the meaning and context behind this quote.'
        : '')

    // 要望: 名言（=引用文/名言）→ 著者 → サイト名 の順にする（著者がある場合）
    const title = author ? `${titleCore}｜${author}｜${siteName}` : `${titleCore}｜${siteName}`
    const desc = author
      ? `${author}${source ? ` / ${source}` : ''}：${descBody}`.trim()
      : descBody

    const keywordsBase = isJa ? ['名言', 'テーマ'] : ['quotes', 'theme']
    const keywords = [author, source, ...keywordsBase].map((x) => String(x || '').trim()).filter(Boolean)
    const meta = generateSEOMetadata({
      title,
      description: desc || undefined,
      keywords: keywords.length ? keywords : keywordsBase,
      type: 'article',
      canonical,
    })
    // JPは試験運用：名言詳細は noindex,follow
    if (country === 'jp') {
      ;(meta as any).robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
    }
    return meta
  } catch {
    const meta = generateSEOMetadata({
      title: `${isJa ? '名言' : 'Quote'}｜${siteName}`,
      canonical,
    })
    if (country === 'jp') {
      ;(meta as any).robots = { index: false, follow: true, googleBot: { index: false, follow: true } }
    }
    return meta
  }
}

export default async function QuoteDetailPage({ params }: { params: { country: string; quoteId: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  const isJa = lang === 'ja'
  const locale = isJa ? 'ja' : 'en'

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

  const authorName = String(q.author_name || '').trim()

  const dateIso = q.updated_at || q.created_at
  const dateText = dateIso ? new Date(dateIso).toLocaleDateString(locale, { year: 'numeric', month: '2-digit', day: '2-digit' }) : null

  return (
    <main className={styles.page}>
      <div className={styles.topNav}>
        <Link href={`/${country}/quotes`} className={styles.backLink}>
          {t.pages.quotes.backToList}
        </Link>
      </div>

      <Card className={styles.headerCard}>
        <CardTitle as="h1" className={styles.title}>
          <span className={styles.cardTitleAccent}>{isJa ? '名言' : 'Quote'}</span>
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
                  href={`/${country}/quotes/theme/${encodeURIComponent(themeKey)}`}
              className={styles.tagPill}
              title={lang === 'ja' ? `テーマ「${themeLabel}」で絞り込み` : `Filter by theme: ${themeLabel}`}
            >
              {themeLabel}
            </Link>
          </div>
        ) : null}
      </Card>

      {q.note ? (
        <Card className={styles.noteCard} as="section">
          <CardTitle as="h2" className={styles.sectionTitle}>
            {isJa ? 'ひとこと' : 'Note'}
          </CardTitle>
          <CardContent className={styles.noteText}>
            <p>{q.note}</p>
          </CardContent>
        </Card>
      ) : null}

      <div className={styles.bottomNav}>
        {authorName ? (
          <Link
            href={`/${country}/quotes?q=${encodeURIComponent(authorName)}`}
            className={styles.bottomLink}
            title={isJa ? `著者「${authorName}」の名言を検索` : `Search quotes by ${authorName}`}
          >
            {isJa ? 'この著者の他の名言を見る' : `More quotes by ${authorName}`}
          </Link>
        ) : null}
        <Link href={`/${country}`} className={styles.bottomLink}>
          ← {t.nav.top}
        </Link>
      </div>
    </main>
  )
}


