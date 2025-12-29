import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type LatestResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { useTranslations, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getViewFromSearchParams, type View } from '@/lib/view-switch'

export function generateMetadata({
  params,
  searchParams,
}: {
  params: { country: string; page: string }
  searchParams: { lang?: string; view?: string }
}) {
  return {
    title: `Latest - Page ${params.page} - ${params.country.toUpperCase()}`,
  }
}

export default async function LatestPagePage({
  params,
  searchParams,
}: {
  params: { country: string; page: string }
  searchParams: { lang?: string; view?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = searchParams.lang === 'en' || searchParams.lang === 'ja' ? searchParams.lang : getLocaleForCountry(country)
  const view: View = getViewFromSearchParams(searchParams)
  const pageNum = parseInt(params.page, 10)
  if (isNaN(pageNum) || pageNum < 2) return notFound()
  const t = useTranslations(country, lang)

  const cursor = (pageNum - 1) * 30
  const data = await fetchJson<LatestResponse>(
    `/v1/${country}/latest?limit=30&cursor=${cursor}&lang=${lang}&view=${view}`,
    { next: { revalidate: 30 } }
  )
  const isPartial = Boolean(data.meta?.is_partial)

  return (
    <main>
      <div style={{ marginBottom: '1rem' }}>
        <h1 style={{ fontSize: '1.4rem', marginBottom: '0.5rem' }}>{t.pages.latest.title}</h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
          {t.pages.latest.description}
        </p>
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
                    <span>{t.category}</span>
                    {t.last_source_published_at && (
                      <span>{new Date(t.last_source_published_at).toLocaleString()}</span>
                    )}
                  </CardMeta>
                </Card>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {pageNum > 1 && (
              <Link
                href={pageNum === 2 ? `/${country}/latest` : `/${country}/latest/${pageNum - 1}`}
                style={{
                  display: 'inline-block',
                  padding: '0.6rem 1.2rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                ← {t.common.prev} {t.common.page}
              </Link>
            )}
            {data.meta.next_cursor && data.meta.next_cursor > 0 && (
              <Link
                href={`/${country}/latest/${pageNum + 1}`}
                style={{
                  display: 'inline-block',
                  padding: '0.6rem 1.2rem',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text)',
                  textDecoration: 'none',
                }}
              >
                {t.common.next} {t.common.page} →
              </Link>
            )}
          </div>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={country === 'jp' ? 'このページにはトピックがありません' : 'No topics on this page'}
          description={country === 'jp' ? '前のページに戻るか、最新のトピックをご覧ください。' : 'Go back to the previous page or view the latest topics.'}
          action={{ label: t.pages.latest.title, href: `/${country}/latest` }}
        />
      )}
    </main>
  )
}

