import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TopicsResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { NewsSearchForm } from '@/components/news/NewsSearchForm'
import { useTranslations, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getViewFromSearchParams, type View } from '@/lib/view-switch'

// Categories are handled by dedicated category pages (/category/[category]).

export function generateMetadata({ params, searchParams }: { params: { country: string }; searchParams: { q?: string; lang?: string; view?: string } }) {
  const country = params.country
  const query = searchParams.q || ''
  const title = query ? (country === 'jp' ? `検索: ${query}` : `Search: ${query}`) : (country === 'jp' ? 'ニュース（棚）' : 'News')
  return {
    title: `${title} - ${country.toUpperCase()}`,
  }
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; category?: string; lang?: string; view?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const view: View = getViewFromSearchParams(searchParams)
  const query = searchParams.q || ''
  const category = searchParams.category || ''
  const t = useTranslations(country, lang)

  const apiPath = `/v1/${country}/topics?limit=30&lang=${lang}&view=${view}${query ? `&q=${encodeURIComponent(query)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`
  const data = await fetchJson<TopicsResponse>(apiPath, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{t.pages.news.title}</h1>
        {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
      </div>

      <div style={{ height: 12 }} />

      <NewsSearchForm country={country} initialQuery={query} />

      <div style={{ height: 16 }} />

      {query && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {t.pages.news.searchResults}: 「{query}」 ({data.topics.length}{country === 'jp' ? '件' : ''})
          </p>
        </div>
      )}

      {data.topics.length > 0 ? (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {data.topics.map((t) => (
              <Link key={t.topic_id} href={`/${country}/news/n/${t.topic_id}`}>
                <Card clickable>
                  <CardTitle>{t.title}</CardTitle>
                  {t.summary && (
                    <CardContent style={{ marginTop: '0.5rem' }}>
                      <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--muted)' }}>
                        {t.summary}
                      </p>
                    </CardContent>
                  )}
                  <CardMeta style={{ marginTop: '0.5rem' }}>
                    <span>{t.category}</span>
                    <span>{t.source_count} sources</span>
                    {t.last_source_published_at && (
                      <span>{new Date(t.last_source_published_at).toLocaleString()}</span>
                    )}
                  </CardMeta>
                </Card>
              </Link>
            ))}
          </div>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={query ? t.empty.noSearchResults : t.empty.noTopics}
          description={query ? t.empty.noSearchResultsDescription : t.empty.noTopicsDescription}
          action={
            query
              ? { label: t.common.more, href: `/${country}/news` }
              : { label: t.nav.top, href: `/${country}` }
          }
        />
      )}
    </main>
  )
}
