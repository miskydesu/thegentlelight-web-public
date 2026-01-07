import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type LatestResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { BadgeGroup } from '@/components/ui/BadgeGroup'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { formatTopicListDate } from '@/lib/topicDate'
import { canonicalUrl, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
// 表示はsoft一本（UX方針）

export function generateMetadata({ params }: { params: { country: string } }) {
  const country = params.country
  const canonical = canonicalUrl(`/${country}/latest`)
  const hreflang = generateHreflang('/latest')
  return {
    title: `Latest - ${country.toUpperCase()}`,
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function LatestPage({
  params,
}: {
  params: { country: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const base = getSiteBaseUrl()
  const isJa = country === 'jp'
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: isJa ? '最新' : 'Latest', url: `${base}/${country}/latest` },
    ],
  })
  const data = await fetchJson<LatestResponse>(`/v1/${country}/latest?limit=30`, {
    next: { revalidate: CACHE_POLICY.frequent },
  })
  const isPartial = Boolean(data.meta?.is_partial)
  const t = getTranslationsForCountry(country, lang)
  const locale = lang === 'ja' ? 'ja' : 'en'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
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

          {data.meta.next_cursor && data.meta.next_cursor > 0 && (
            <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
              <Link
                href={`/${country}/latest/2`}
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
            </div>
          )}

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={t.empty.noTopics}
          description={t.empty.noTopicsDescription}
          action={{ label: t.pages.news.title, href: `/${country}/news` }}
        />
      )}
      </main>
    </>
  )
}

