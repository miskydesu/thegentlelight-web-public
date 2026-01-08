import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'

type QuotesResponse = {
  quotes: Array<{
    quote_id: string
    author_name: string | null
    source_text: string | null
    quote_text: string | null
    note: string | null
    tags: string[]
    created_at: string | null
    updated_at: string | null
  }>
  meta: ApiMeta
}

export async function generateMetadata({ params }: { params: { country: string; author: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'

  const authorName = String(decodeURIComponent(params.author || '')).trim()
  if (!authorName) return {}

  const canonical = canonicalUrl(`/${country}/quotes/author/${encodeURIComponent(authorName)}`)
  const hreflang = generateHreflang(`/quotes/author/${encodeURIComponent(authorName)}`)

  return {
    title: isJa ? `${authorName}の名言` : `${authorName} Quotes`,
    description: isJa ? `「${authorName}」の名言をまとめました。` : `Quotes by ${authorName}.`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function QuoteAuthorPage({ params }: { params: { country: string; author: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)
  const isJa = lang === 'ja'

  const authorName = String(decodeURIComponent(params.author || '')).trim()
  if (!authorName) return notFound()

  // まず検索で候補を取り、author_name の完全一致（前後空白無視）に絞って「著者の名言」にする
  const data = await fetchJson<QuotesResponse>(
    `/v1/${country}/quotes?limit=80&q=${encodeURIComponent(authorName)}`,
    { next: { revalidate: CACHE_POLICY.stable } },
  )

  const norm = (s: string | null | undefined) => String(s || '').trim().toLowerCase()
  const target = norm(authorName)
  const quotes = (data.quotes || []).filter((q) => norm(q.author_name) === target)

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>{isJa ? `${authorName}の名言` : `${authorName} Quotes`}</h1>
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
            <span className={styles.themeLabel}>{authorName}</span>
            <span className={styles.themeCount}>{quotes.length}</span>
          </div>
        </div>
      </div>

      {quotes.length ? (
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

