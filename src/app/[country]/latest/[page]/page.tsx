import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type LatestResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { formatTopicListDate } from '@/lib/topicDate'
import { canonicalUrl } from '@/lib/seo'
import { generateHreflang } from '@/lib/seo-helpers'
// 表示はsoft一本（UX方針）

export function generateMetadata({
  params,
}: {
  params: { country: string; page: string }
}) {
  const country = params.country
  const page = params.page
  const canonical = canonicalUrl(`/${country}/latest/${page}`)
  const hreflang = generateHreflang(`/latest/${page}`)
  return {
    title: `Latest - Page ${page} - ${country.toUpperCase()}`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function LatestPagePage({
  params,
}: {
  params: { country: string; page: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const pageNum = parseInt(params.page, 10)
  if (isNaN(pageNum) || pageNum < 2) return notFound()
  const t = getTranslationsForCountry(country, lang)
  const locale = lang === 'ja' ? 'ja' : 'en'

  const cursor = (pageNum - 1) * 30
  const data = await fetchJson<LatestResponse>(
    `/v1/${country}/latest?limit=30&cursor=${cursor}`,
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
                    {formatTopicListDate(t.last_source_published_at, locale) ? (
                      <span>{formatTopicListDate(t.last_source_published_at, locale)}</span>
                    ) : null}
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
          description={country === 'jp' ? '前のページに戻るか、最新のトピックをご覧ください。' : 'Go back to the previous page or check the latest topics.'}
          action={{ label: t.pages.latest.title, href: `/${country}/latest` }}
        />
      )}
    </main>
  )
}

