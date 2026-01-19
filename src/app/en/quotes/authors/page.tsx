import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import styles from '../../../[country]/quotes/quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
import { EmptyState } from '@/components/ui/EmptyState'
import { getCountryPreferenceHint } from '@/lib/server/preferred-english-country'
import { EnglishEditionBanner } from '@/components/en/EnglishEditionBanner'

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

export async function generateMetadata() {
  return {
    title: 'Browse by Author',
    description: 'Browse quotes by author.',
    alternates: { canonical: canonicalUrl('/en/quotes/authors') },
  }
}

export default async function EnQuoteAuthorsPage() {
  const sourceCountry = 'ca'
  const pref = getCountryPreferenceHint()
  const preferred = pref.country

  // NOTE: 現状APIに「著者一覧」が無いため、最新N件から著者を抽出して上位順で並べる。
  const data = await fetchJson<QuotesResponse>(`/v1/${sourceCountry}/quotes?limit=300`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()

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
        <h1 style={{ fontSize: '1.4rem' }}>Browse by Author</h1>
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
            {authors.map((a) => (
              <Link
                key={a.name}
                href={`/en/quotes/author/${encodeURIComponent(a.name)}`}
                className={styles.themeItem}
                title={`Quotes by ${a.name}`}
              >
                <span className={styles.themeLabel}>{a.name}</span>
                <span className={styles.themeCount}>{a.count}</span>
              </Link>
            ))}
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

