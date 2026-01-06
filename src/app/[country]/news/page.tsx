import { notFound } from 'next/navigation'
import Link from 'next/link'
import { isCountry, fetchJson, type TopicsResponse } from '@/lib/tglApi'
import { EmptyState } from '@/components/ui/EmptyState'
import { PartialNotice } from '@/components/ui/PartialNotice'
import { Card, CardTitle, CardContent, CardMeta } from '@/components/ui/Card'
import { NewsSearchForm } from '@/components/news/NewsSearchForm'
import { getTranslationsForCountry, getLocaleForCountry, type Locale } from '@/lib/i18n'
import { getGentleFromSearchParams } from '@/lib/view-switch'
import { formatTopicListDate } from '@/lib/topicDate'
import { getCategoryBadgeTheme, getCategoryLabel } from '@/lib/categories'
import styles from './news.module.css'
// 表示はsoft一本（UX方針）

// Categories are handled by dedicated category pages (/category/[category]).

export function generateMetadata({ params, searchParams }: { params: { country: string }; searchParams: { q?: string } }) {
  const country = params.country
  const query = searchParams.q || ''
  const title = query ? (country === 'jp' ? `検索: ${query}` : `Search: ${query}`) : (country === 'jp' ? 'ニュース検索' : 'News')
  return {
    title: `${title} - ${country.toUpperCase()}`,
  }
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: { country: string }
  searchParams: { q?: string; category?: string; gentle?: string; cursor?: string; limit?: string }
}) {
  const country = params.country
  if (!isCountry(country)) return notFound()

  const lang: Locale = getLocaleForCountry(country)
  const query = searchParams.q || ''
  const category = searchParams.category || ''
  const t = getTranslationsForCountry(country, lang)
  const gentle = getGentleFromSearchParams(searchParams)
  const locale = lang === 'ja' ? 'ja' : 'en'

  const cursor = Number.isFinite(Number(searchParams.cursor)) ? Math.max(0, Math.trunc(Number(searchParams.cursor))) : 0
  const limit = Number.isFinite(Number(searchParams.limit)) ? Math.min(100, Math.max(1, Math.trunc(Number(searchParams.limit)))) : 30
  const apiPath = `/v1/${country}/topics?limit=${limit}&cursor=${cursor}${gentle ? `&gentle=1` : ''}${query ? `&q=${encodeURIComponent(query)}` : ''}${category ? `&category=${encodeURIComponent(category)}` : ''}`
  const data = await fetchJson<TopicsResponse>(apiPath, { next: { revalidate: 30 } })
  const isPartial = Boolean(data.meta?.is_partial)
  const hasNext = data.topics.length === limit
  const hasPrev = cursor > 0
  const start = data.topics.length > 0 ? cursor + 1 : 0
  const end = cursor + data.topics.length

  const buildUrl = (nextCursor: number) => {
    const sp = new URLSearchParams()
    if (query) sp.set('q', query)
    if (category) sp.set('category', category)
    if (gentle) sp.set('gentle', '1')
    if (limit !== 30) sp.set('limit', String(limit))
    if (nextCursor > 0) sp.set('cursor', String(nextCursor))
    const qs = sp.toString()
    return `/${country}/news${qs ? `?${qs}` : ''}`
  }

  return (
    <main>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '1rem', flexWrap: 'wrap' }}>
        <h1 style={{ fontSize: '1.4rem' }}>{t.pages.news.title}</h1>
        {isPartial && <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>部分取得（partial）</span>}
      </div>

      <div style={{ height: 12 }} />

      <NewsSearchForm country={country} initialQuery={query} initialCategory={category} />

      <div style={{ height: 16 }} />

      {(query || category) && (
        <div style={{ marginBottom: '1rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            {t.pages.news.searchResults}:
            {query ? ` 「${query}」` : ''}
            {category ? ` / ${getCategoryLabel(category, locale)}` : ''}
            {start && end ? `（${start}-${end}）` : ''}
          </p>
        </div>
      )}

      {data.topics.length > 0 ? (
        <>
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

          <div className={styles.pagerRow}>
            <div className={styles.pagerInfo}>
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
