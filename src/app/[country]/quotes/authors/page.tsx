import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type ApiMeta } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
import { EmptyState } from '@/components/ui/EmptyState'

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

export async function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'

  const canonical = canonicalUrl(`/${country}/quotes/authors`)
  const hreflang = generateHreflang('/quotes/authors')

  return {
    title: isJa ? '著者で選ぶ' : 'Browse by Author',
    description: isJa ? '名言を著者から選べます。' : 'Browse quotes by author.',
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function QuoteAuthorsPage({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const t = getTranslationsForCountry(country, lang)

  // NOTE: 現状APIに「著者一覧」が無いため、最新N件から著者を抽出して上位順で並べる。
  const data = await fetchJson<QuotesResponse>(`/v1/${country}/quotes?limit=300`, {
    next: { revalidate: CACHE_POLICY.stable },
  })

  const counts = new Map<string, number>()
  for (const q of data.quotes || []) {
    const a = String(q.author_name || '').trim()
    if (!a) continue
    counts.set(a, (counts.get(a) || 0) + 1)
  }

  const authors = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 60)

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>{lang === 'ja' ? '著者で選ぶ' : 'Browse by Author'}</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>{t.pages.quotes.subtitle}</span>
      </div>

      <div style={{ height: 12 }} />

      {authors.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>{lang === 'ja' ? '著者一覧' : 'Authors'}</div>
            <div className={styles.shelfActions}>
              <Link href={`/${country}/quotes`} className={styles.shelfLink}>
                {lang === 'ja' ? '名言トップへ' : 'Back to Quotes'}
              </Link>
              <div className={styles.shelfHint}>
                {lang === 'ja' ? 'タップで著者別の名言へ' : 'Tap an author to see quotes'}
              </div>
            </div>
          </div>

          <div className={styles.authorShelfGrid}>
            {authors.map((a) => (
              <Link
                key={a.name}
                href={`/${country}/quotes/author/${encodeURIComponent(a.name)}`}
                className={styles.themeItem}
                title={lang === 'ja' ? `著者「${a.name}」の名言` : `Quotes by ${a.name}`}
              >
                <span className={styles.themeLabel}>{a.name}</span>
                <span className={styles.themeCount}>{a.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          title={lang === 'ja' ? '著者が見つかりません' : 'No authors found'}
          description={lang === 'ja' ? 'まずは名言一覧をご覧ください。' : 'Please check the quotes list first.'}
          action={{ label: lang === 'ja' ? '名言トップ' : 'Quotes', href: `/${country}/quotes` }}
        />
      )}
    </main>
  )
}

