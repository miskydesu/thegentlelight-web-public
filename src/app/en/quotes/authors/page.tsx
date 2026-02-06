import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type QuoteAuthorsFromQuotesResponse } from '@/lib/tglApi'
import styles from '../../../[country]/quotes/quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCountryPreferenceHint } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'
import { generateHreflangSharedEn } from '@/lib/seo-helpers'

export async function generateMetadata() {
  return {
    title: 'Find Calming Quotes by Great Thinkers & Authors',
    description: 'Browse calming quotes by philosophers, writers, and other great thinkers.',
    alternates: {
      canonical: canonicalUrl('/en/quotes/authors'),
      languages: Object.fromEntries(generateHreflangSharedEn('/quotes/authors').map((h) => [h.lang, h.url])),
    },
  }
}

export default async function EnQuoteAuthorsPage() {
  const sourceCountry = 'ca'
  const pref = getCountryPreferenceHint()
  const preferred = pref.country

  const data = await fetchJson<QuoteAuthorsFromQuotesResponse>(`/v1/${sourceCountry}/quotes/authors?limit=200`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()
  const authors = (data.authors || []).filter((a) => a.name)

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>Find quotes by great thinkers & authors</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>calm words</span>
      </div>

      <div style={{ height: 12 }} />

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="quotes"
        inferredCountry={pref.source === 'geo' ? preferred : null}
        inferredSource={pref.source}
      />

      {authors.length ? (
        <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
          <div className={styles.themeShelfHeader}>
            <div className={styles.themeShelfTitle}>Authors</div>
            <div className={styles.shelfActions}>
              <Link href={`/en/quotes`} className={styles.shelfLink}>
                Back to Quotes
              </Link>
              <div className={styles.shelfHint}>Tap an author to see quotes</div>
            </div>
          </div>

          <div className={styles.authorShelfGrid}>
            {authors.map((a) => {
              const label = a.name
              return (
              <Link
                key={label}
                href={`/en/quotes/author/${encodeURIComponent(label)}`}
                className={styles.themeItem}
                title={`Quotes by ${label}`}
              >
                <span className={styles.themeLabelWrap}>
                  <span className={styles.themeLabel}>{label}</span>
                  {a.has_detail ? <span className={styles.themeHint}>Details available</span> : null}
                </span>
                <span className={styles.themeCount}>{a.count}</span>
              </Link>
              )
            })}
          </div>
        </div>
      ) : (
        <EmptyState
          title="No authors found"
          description="Please check the quotes list first."
          action={{ label: 'Quotes', href: `/en/quotes` }}
        />
      )}
    </main>
  )
}

