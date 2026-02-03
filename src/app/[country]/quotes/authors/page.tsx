import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type QuoteAuthorsFromQuotesResponse } from '@/lib/tglApi'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import styles from '../quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
import { EmptyState } from '@/components/ui/EmptyState'

export async function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  if (!isCountry(country)) return {}
  const lang: Locale = getLocaleForCountry(country)
  const isJa = lang === 'ja'

  const canonical = canonicalUrl(`/${country}/quotes/authors`)
  const hreflang = generateHreflang('/quotes/authors')

  return {
    title: isJa ? '名言を偉人・著者で探す' : 'Find quotes by great thinkers & authors',
    description: isJa
      ? '哲学者・作家など偉人／著者別に、名言を探せます。'
      : 'Browse calming quotes by philosophers, writers, and other great thinkers.',
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

  const data = await fetchJson<QuoteAuthorsFromQuotesResponse>(`/v1/${country}/quotes/authors?limit=200`, {
    next: { revalidate: CACHE_POLICY.stable },
  })
  const authors = (data.authors || []).filter((a) => a.name)

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>
          {lang === 'ja' ? '名言を偉人・著者で探す' : 'Find quotes by great thinkers & authors'}
        </h1>
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
            {authors.map((a) => {
              const label = a.name
              return (
              <Link
                key={label}
                href={`/${country}/quotes/author/${encodeURIComponent(label)}`}
                className={styles.themeItem}
                title={lang === 'ja' ? `著者「${label}」の名言` : `Quotes by ${label}`}
              >
                <span className={styles.themeLabelWrap}>
                  <span className={styles.themeLabel}>{label}</span>
                  {a.has_detail ? (
                    <span className={styles.themeHint}>{lang === 'ja' ? '詳細あり' : 'Details available'}</span>
                  ) : null}
                </span>
                <span className={styles.themeCount}>{a.count}</span>
              </Link>
              )
            })}
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

