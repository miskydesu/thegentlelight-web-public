import { notFound } from 'next/navigation'
import Link from 'next/link'
import { fetchJson, type ApiMeta } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { Card, CardTitle } from '@/components/ui/Card'
import styles from '../../../[country]/quotes/quotes.module.css'
import { CACHE_POLICY } from '@/lib/cache-policy'
import { canonicalUrl } from '@/lib/seo'
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

export async function generateMetadata({ params }: { params: { author: string } }) {
  const authorName = String(decodeURIComponent(params.author || '')).trim()
  if (!authorName) return {}
  return {
    title: `${authorName} Quotes`,
    description: `Quotes by ${authorName}.`,
    alternates: { canonical: canonicalUrl(`/en/quotes/author/${encodeURIComponent(authorName)}`) },
  }
}

export default async function EnQuoteAuthorPage({ params }: { params: { author: string } }) {
  const sourceCountry = 'ca'
  const pref = getCountryPreferenceHint()
  const preferred = pref.country
  const authorName = String(decodeURIComponent(params.author || '')).trim()
  if (!authorName) return notFound()

  // まず検索で候補を取り、author_name の完全一致（前後空白無視）に絞って「著者の名言」にする
  const data = await fetchJson<QuotesResponse>(`/v1/${sourceCountry}/quotes?limit=80&q=${encodeURIComponent(authorName)}`, {
    next: { revalidate: CACHE_POLICY.stable },
  }).catch(() => null)
  if (!data) return notFound()

  const norm = (s: string | null | undefined) => String(s || '').trim().toLowerCase()
  const target = norm(authorName)
  const quotes = (data.quotes || []).filter((q) => norm(q.author_name) === target)

  return (
    <main>
      <div className={styles.shelfHeader}>
        <h1 style={{ fontSize: '1.4rem' }}>{`${authorName} Quotes`}</h1>
        <span style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>calm words</span>
      </div>

      <div style={{ height: 12 }} />

      <EnglishEditionBanner
        initialEdition={(preferred === 'uk' || preferred === 'ca' || preferred === 'us' ? preferred : 'us') as any}
        kind="quotes"
        inferredCountry={pref.source === 'geo' ? preferred : null}
        inferredSource={pref.source}
      />

      <div className={styles.themeShelf} style={{ marginBottom: 14 }}>
        <div className={styles.themeShelfHeader}>
          <div className={styles.themeShelfTitle}>Author</div>
          <div className={styles.shelfActions}>
            <Link href={`/en/quotes/authors`} className={styles.shelfLink}>
              All Authors
            </Link>
            <Link href={`/en/quotes`} className={styles.shelfLink}>
              Quotes
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
              <Link href={`/en/quotes/${q.quote_id}`} className={styles.mainLink}>
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
          title="No quotes found"
          description="There may be author name variations."
          action={{ label: 'Authors', href: `/en/quotes/authors` }}
        />
      )}
    </main>
  )
}

