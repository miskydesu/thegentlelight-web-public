import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TopicsResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getGentleFromSearchParams } from '@/lib/view-switch'
import { CATEGORIES, getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import styles from './category.module.css'
import { formatTopicListDate } from '@/lib/topicDate'
import { canonicalUrl, getSiteBaseUrl } from '@/lib/seo'
import { generateHreflang, generateBreadcrumbListJSONLD } from '@/lib/seo-helpers'
import { CACHE_POLICY } from '@/lib/cache-policy'
// 表示はsoft一本（UX方針）

export function generateMetadata({
  params,
}: {
  params: { country: string; category: string }
}) {
  const category = CATEGORIES.find((c) => c.code === params.category)
  const canonical = canonicalUrl(`/${params.country}/category/${encodeURIComponent(params.category)}`)
  const hreflang = generateHreflang(`/category/${params.category}`)
  const isJa = params.country === 'jp'
  const catLabel = isJa ? (category?.labelJa || category?.label || params.category) : (category?.label || category?.labelJa || params.category)
  return {
    title: isJa ? `${catLabel}ニュース` : `${catLabel} News`,
    description: isJa
      ? `不安のない${catLabel}ニュース。穏やかで、煽られない言葉で整理。`
      : `Calm ${catLabel} news without anxiety. Fact-based reporting that protects your mental health.`,
    keywords: isJa
      ? [`${catLabel}ニュース`, `穏やかな${catLabel}`, 'やさしいニュース', '不安のないニュース', '煽られないニュース']
      : [`${catLabel} news`, `calm ${catLabel}`, 'gentle news', 'news without anxiety'],
    alternates: {
      canonical,
      languages: Object.fromEntries(hreflang.map((h) => [h.lang, h.url])),
    },
  }
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { country: string; category: string }
  searchParams: { gentle?: string; cursor?: string; limit?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const category = CATEGORIES.find((c) => c.code === params.category)
  if (!category) return notFound()
  const t = getTranslationsForCountry(country, lang)
  const gentle = getGentleFromSearchParams(searchParams)
  const locale = lang === 'ja' ? 'ja' : 'en'
  const base = getSiteBaseUrl()
  const isJa = country === 'jp'
  const breadcrumbJSONLD = generateBreadcrumbListJSONLD({
    items: [
      { name: 'The Gentle Light', url: `${base}/` },
      { name: isJa ? 'トップ' : 'Home', url: `${base}/${country}` },
      { name: getCategoryLabel(category.code, locale), url: `${base}/${country}/category/${category.code}` },
    ],
  })

  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const limit = Number.isFinite(Number(searchParams.limit)) ? Math.min(100, Math.max(1, Math.trunc(Number(searchParams.limit)))) : 30

  const data = await fetchJson<TopicsResponse>(
    `/v1/${country}/topics?category=${encodeURIComponent(category.code)}&limit=${limit}&cursor=${cursor}${gentle ? `&gentle=1` : ''}`,
    { next: { revalidate: CACHE_POLICY.frequent } }
  )
  const isPartial = Boolean(data.meta?.is_partial)
  const hasNext = data.topics.length === limit
  const hasPrev = cursor > 0
  const start = data.topics.length > 0 ? cursor + 1 : 0
  const end = cursor + data.topics.length

  const buildUrl = (nextCursor: number) => {
    const sp = new URLSearchParams()
    if (gentle) sp.set('gentle', '1')
    if (limit !== 30) sp.set('limit', String(limit))
    if (nextCursor > 0) sp.set('cursor', String(nextCursor))
    const qs = sp.toString()
    return `/${country}/category/${encodeURIComponent(category.code)}${qs ? `?${qs}` : ''}`
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJSONLD),
        }}
      />
      <main>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          gap: '1rem',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(0, 0, 0, 0.22)',
          paddingBottom: 8,
          marginBottom: 2,
        }}
      >
        <h1 style={{ fontSize: '1.4rem' }}>{getCategoryLabel(category.code, locale)}</h1>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {start && end ? (locale === 'ja' ? `表示: ${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(cursor + data.topics.length)}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </span>
              )}
            </div>
          </div>

          <div className={styles.listGrid}>
            {data.topics.map((x) => (
              <Link key={x.topic_id} href={`/${country}/news/n/${x.topic_id}`}>
                {(() => {
                  const theme = getCategoryBadgeTheme(x.category)
                  const isHeartwarming = x.category === 'heartwarming'
                  return (
                    <Card
                      clickable
                      className={`${styles.topCard} ${isHeartwarming ? styles.topCardHeartwarming : ''}`}
                      style={{ ['--cat-color' as any]: theme.color } as any}
                    >
                      <CardTitle className={styles.cardTitleAccent}>{x.title}</CardTitle>
                      {x.summary ? (
                        <CardContent style={{ marginTop: '0.25rem' }}>
                          <p className={styles.cardSummary}>{x.summary}</p>
                        </CardContent>
                      ) : null}
                      <CardMeta style={{ marginTop: '0.5rem', columnGap: 0, rowGap: 0 }}>
                        <span className={`${styles.categoryBadge} ${styles.metaItem}`} style={theme}>
                          {getCategoryLabel(x.category, locale)}
                        </span>
                        {Boolean(x.high_arousal) || (x.distress_score ?? 0) >= 50 ? (
                          <span className={`${styles.categoryBadge} ${styles.metaItem}`} style={{ opacity: 0.75 }}>
                            {locale === 'ja' ? '心の負担に注意' : 'May be upsetting'}
                          </span>
                        ) : null}
                        <span className={`${styles.sourceCountPill} ${styles.metaItem}`}>
                          {locale === 'ja'
                            ? `参照元 : ${x.source_count}記事`
                            : `Sources: ${x.source_count} ${x.source_count === 1 ? 'article' : 'articles'}`}
                        </span>
                      </CardMeta>
                      {formatTopicListDate(x.last_source_published_at, locale) ? (
                        <span className={styles.cardDate}>
                          {formatTopicListDate(x.last_source_published_at, locale)}
                        </span>
                      ) : null}
                    </Card>
                  )
                })()}
              </Link>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 14 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              {start && end ? (locale === 'ja' ? `表示: ${start}-${end}` : `Showing: ${start}-${end}`) : null}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {hasPrev ? (
                <Link className="tglButton" href={buildUrl(Math.max(0, cursor - limit))}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '前へ' : 'Prev'}
                </span>
              )}
              {hasNext ? (
                <Link className="tglButton" href={buildUrl(cursor + data.topics.length)}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </Link>
              ) : (
                <span className="tglButton" style={{ opacity: 0.35, pointerEvents: 'none' }}>
                  {locale === 'ja' ? '次へ' : 'Next'}
                </span>
              )}
            </div>
          </div>

          {isPartial && <PartialNotice country={country} />}
        </>
      ) : (
        <EmptyState
          title={t.empty.noCategoryResults}
          description={t.empty.noCategoryResultsDescription}
          action={{ label: country === 'jp' ? '本日の朝刊へ' : "Go to today's briefing", href: `/${country}/daily/today` }}
        />
      )}
      </main>
    </>
  )
}

