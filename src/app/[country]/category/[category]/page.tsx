import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TopicsResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { useTranslations, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getGentleFromSearchParams } from '@/lib/view-switch'
// 表示はsoft一本（UX方針）

const CATEGORIES = [
  { code: 'heartwarming', label: 'Heartwarming', labelJa: '優しい話' },
  { code: 'politics', label: 'Politics', labelJa: '政治' },
  { code: 'business', label: 'Business', labelJa: 'ビジネス' },
  { code: 'technology', label: 'Technology', labelJa: 'テクノロジー' },
  { code: 'health', label: 'Health', labelJa: '健康' },
  { code: 'science_earth', label: 'Science & Earth', labelJa: '科学と地球' },
  { code: 'arts', label: 'Arts', labelJa: '文化' },
]

export function generateMetadata({
  params,
}: {
  params: { country: string; category: string }
}) {
  const category = CATEGORIES.find((c) => c.code === params.category)
  return {
    title: `${category?.labelJa || category?.label || params.category} - ${params.country.toUpperCase()}`,
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { country: string; category: string }
  searchParams: { gentle?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const category = CATEGORIES.find((c) => c.code === params.category)
  if (!category) return notFound()
  const t = useTranslations(country, lang)
  const gentle = getGentleFromSearchParams(searchParams)

  const data = await fetchJson<TopicsResponse>(
    `/v1/${country}/topics?category=${encodeURIComponent(category.code)}&limit=30${gentle ? `&gentle=1` : ''}`,
    { next: { revalidate: 30 } }
  )
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{country === 'jp' ? category.labelJa : category.label}</h1>
        <Link
          href={`/${country}/news${gentle ? '?gentle=1' : ''}`}
          style={{ fontSize: '0.9rem', color: 'var(--muted)', textDecoration: 'none' }}
        >
          {t.pages.category.seeMore}
        </Link>
      </div>

      <div style={{ height: 12 }} />

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
          title={t.empty.noCategoryResults}
          description={t.empty.noCategoryResultsDescription}
          action={{ label: t.pages.today.title, href: `/${country}/today` }}
        />
      )}
    </main>
  )
}

